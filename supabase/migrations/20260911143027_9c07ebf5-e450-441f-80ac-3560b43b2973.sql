ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS job_title_id uuid REFERENCES public.job_titles(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS profiles_job_title_id_idx ON public.profiles(job_title_id);

CREATE UNIQUE INDEX IF NOT EXISTS job_titles_name_ci_unique
  ON public.job_titles (lower(name));

INSERT INTO public.job_titles (name, description, active)
VALUES
  ('Supply', 'Responsável pelas solicitações de compras e serviços.', true),
  ('Financeiro', 'Responsável pela aprovação financeira.', true),
  ('Fábrica', 'Responsável pelas atividades da fábrica.', true),
  ('Estoquista', 'Responsável pelo estoque.', true)
ON CONFLICT (lower(name)) DO UPDATE SET active = true;

UPDATE public.profiles p
SET job_title_id = jt.id
FROM public.user_roles ur
JOIN public.job_titles jt ON lower(jt.name) = CASE ur.role::text
  WHEN 'comprador' THEN 'supply'
  WHEN 'financeiro' THEN 'financeiro'
  WHEN 'fabrica' THEN 'fábrica'
  WHEN 'estoquista' THEN 'estoquista'
  WHEN 'coo' THEN 'coo'
  WHEN 'ceo' THEN 'ceo'
  WHEN 'cfo' THEN 'cfo'
  WHEN 'cto' THEN 'cto'
  ELSE '__sem_cargo__'
END
WHERE ur.user_id = p.id
  AND ur.role <> 'admin'
  AND p.job_title_id IS NULL;

CREATE TABLE public.job_title_hierarchy (
  job_title_id uuid PRIMARY KEY REFERENCES public.job_titles(id) ON DELETE RESTRICT,
  approver_job_title_id uuid REFERENCES public.job_titles(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT job_title_hierarchy_no_self CHECK (job_title_id IS DISTINCT FROM approver_job_title_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_title_hierarchy TO authenticated;
GRANT ALL ON public.job_title_hierarchy TO service_role;

ALTER TABLE public.job_title_hierarchy ENABLE ROW LEVEL SECURITY;

CREATE POLICY job_title_hierarchy_select
ON public.job_title_hierarchy FOR SELECT TO authenticated
USING (true);

CREATE POLICY job_title_hierarchy_manage
ON public.job_title_hierarchy FOR ALL TO authenticated
USING (public.is_access_admin(auth.uid()))
WITH CHECK (public.is_access_admin(auth.uid()));

CREATE TRIGGER set_job_title_hierarchy_updated_at
BEFORE UPDATE ON public.job_title_hierarchy
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.prevent_job_title_hierarchy_cycle()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  cursor_id uuid;
  hops integer := 0;
BEGIN
  cursor_id := NEW.approver_job_title_id;
  WHILE cursor_id IS NOT NULL AND hops < 100 LOOP
    IF cursor_id = NEW.job_title_id THEN
      RAISE EXCEPTION 'O organograma não pode conter ciclos';
    END IF;
    SELECT approver_job_title_id INTO cursor_id
    FROM public.job_title_hierarchy
    WHERE job_title_id = cursor_id;
    hops := hops + 1;
  END LOOP;
  IF hops >= 100 THEN
    RAISE EXCEPTION 'O organograma excedeu o limite de níveis';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER prevent_job_title_hierarchy_cycle
BEFORE INSERT OR UPDATE ON public.job_title_hierarchy
FOR EACH ROW EXECUTE FUNCTION public.prevent_job_title_hierarchy_cycle();

INSERT INTO public.job_title_hierarchy (job_title_id, approver_job_title_id)
SELECT child.id, parent.id
FROM (VALUES
  ('Supply', 'COO'),
  ('Fábrica', 'COO'),
  ('Estoquista', 'COO'),
  ('Financeiro', 'CFO'),
  ('COO', 'CEO'),
  ('CFO', 'CEO'),
  ('CTO', 'CEO')
) AS seed(child_name, parent_name)
JOIN public.job_titles child ON lower(child.name) = lower(seed.child_name)
JOIN public.job_titles parent ON lower(parent.name) = lower(seed.parent_name)
ON CONFLICT (job_title_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.has_job_title_name(_user_id uuid, _name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.job_titles jt ON jt.id = p.job_title_id
    WHERE p.id = _user_id
      AND p.deleted_at IS NULL
      AND jt.active
      AND lower(jt.name) = lower(_name)
  );
$$;

CREATE OR REPLACE FUNCTION public.build_approval_chain()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p RECORD;
  v numeric := COALESCE(NEW.estimated_value, 0);
  max_levels integer := 0;
  hops integer := 0;
  idx integer := 0;
  r RECORD;
  cfg RECORD;
  dual_idx integer;
  u RECORD;
  seen uuid[] := '{}';
  cfo_id uuid;
  ceo_id uuid;
  final_id uuid;
  final_lbl text;
  auto_ok boolean := false;
  cur_title uuid;
  nxt_title uuid;
  nxt_name text;
  seen_titles uuid[] := '{}';
  levels_used integer := 0;
  added_any boolean;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF EXISTS (SELECT 1 FROM public.approval_steps WHERE order_id = NEW.id AND status <> 'pendente') THEN
      RETURN NEW;
    END IF;
    DELETE FROM public.approval_steps WHERE order_id = NEW.id;
  END IF;

  SELECT * INTO p FROM public.profiles WHERE id = NEW.requester_id;
  IF p IS NULL THEN RETURN NEW; END IF;

  SELECT p2.id INTO cfo_id
  FROM public.profiles p2 JOIN public.job_titles jt ON jt.id = p2.job_title_id
  WHERE lower(jt.name) = 'cfo' AND jt.active AND p2.deleted_at IS NULL AND p2.id <> NEW.requester_id
  ORDER BY p2.created_at LIMIT 1;

  SELECT p2.id INTO ceo_id
  FROM public.profiles p2 JOIN public.job_titles jt ON jt.id = p2.job_title_id
  WHERE lower(jt.name) = 'ceo' AND jt.active AND p2.deleted_at IS NULL AND p2.id <> NEW.requester_id
  ORDER BY p2.created_at LIMIT 1;

  IF NEW.request_type = 'pagamento' THEN
    IF public.has_job_title_name(NEW.requester_id, 'Financeiro') THEN
      IF cfo_id IS NULL THEN RAISE EXCEPTION 'Nenhum usuário está cadastrado no cargo CFO'; END IF;
      INSERT INTO public.approval_steps (order_id, step_index, role_label, approver_id)
      VALUES (NEW.id, 1, 'Aprovação de Pagamento — CFO', cfo_id);
    ELSE
      added_any := false;
      FOR u IN
        SELECT p2.id AS user_id
        FROM public.profiles p2 JOIN public.job_titles jt ON jt.id = p2.job_title_id
        WHERE lower(jt.name) = 'financeiro' AND jt.active AND p2.deleted_at IS NULL AND p2.id <> NEW.requester_id
        ORDER BY p2.id
      LOOP
        INSERT INTO public.approval_steps (order_id, step_index, role_label, approver_id)
        VALUES (NEW.id, 1, 'Aprovação de Pagamento — Financeiro', u.user_id);
        added_any := true;
      END LOOP;
      IF NOT added_any THEN RAISE EXCEPTION 'Nenhum usuário está cadastrado no cargo Financeiro'; END IF;
    END IF;
    UPDATE public.purchase_orders SET approval_status = 'aguardando_aprovacao' WHERE id = NEW.id;
    RETURN NEW;
  END IF;

  IF cfo_id IS NOT NULL THEN
    final_id := cfo_id; final_lbl := 'Aprovação final — CFO';
  ELSIF ceo_id IS NOT NULL THEN
    final_id := ceo_id; final_lbl := 'Aprovação final — CEO';
  ELSE
    final_id := NULL;
  END IF;

  IF v <= COALESCE(p.approval_limit, 0) THEN max_levels := 0; auto_ok := true;
  ELSIF v <= COALESCE(p.tier2_limit, 50000) THEN max_levels := 2;
  ELSIF v <= COALESCE(p.tier3_limit, 250000) THEN max_levels := 3;
  ELSE max_levels := 5;
  END IF;

  IF NOT auto_ok THEN
    cur_title := p.job_title_id;
    WHILE levels_used < max_levels AND hops < 100 LOOP
      hops := hops + 1;
      IF cur_title IS NULL THEN EXIT; END IF;
      SELECT h.approver_job_title_id, jt.name INTO nxt_title, nxt_name
      FROM public.job_title_hierarchy h
      LEFT JOIN public.job_titles jt ON jt.id = h.approver_job_title_id
      WHERE h.job_title_id = cur_title;
      EXIT WHEN nxt_title IS NULL;
      EXIT WHEN nxt_title = ANY(seen_titles);
      seen_titles := array_append(seen_titles, nxt_title);
      added_any := false;
      FOR u IN
        SELECT p2.id AS user_id
        FROM public.profiles p2
        WHERE p2.job_title_id = nxt_title AND p2.deleted_at IS NULL AND p2.id <> NEW.requester_id
        ORDER BY p2.id
      LOOP
        IF NOT (u.user_id = ANY(seen)) AND (final_id IS NULL OR u.user_id <> final_id) THEN
          idx := idx + 1;
          INSERT INTO public.approval_steps (order_id, step_index, role_label, approver_id)
          VALUES (NEW.id, idx, 'Aprovação — ' || nxt_name, u.user_id);
          seen := array_append(seen, u.user_id);
          added_any := true;
        END IF;
      END LOOP;
      IF added_any THEN levels_used := levels_used + 1; END IF;
      cur_title := nxt_title;
    END LOOP;

    FOR r IN SELECT * FROM public.approval_rules WHERE active ORDER BY position, created_at LOOP
      IF (r.approver_id IS NULL OR NOT (r.approver_id = ANY(seen))) AND (final_id IS NULL OR r.approver_id IS DISTINCT FROM final_id) THEN
        idx := idx + 1;
        INSERT INTO public.approval_steps (order_id, step_index, role_label, approver_id)
        VALUES (NEW.id, idx, r.name, r.approver_id);
        IF r.approver_id IS NOT NULL THEN seen := array_append(seen, r.approver_id); END IF;
      END IF;
    END LOOP;

    SELECT * INTO cfg FROM public.approval_settings WHERE id;
    IF cfg IS NOT NULL AND cfg.dual_approval_enabled AND v > COALESCE(cfg.dual_approval_threshold, 100000) THEN
      dual_idx := idx + 1;
      FOR u IN
        SELECT DISTINCT ON (lower(jt.name)) lower(jt.name) AS title_name, p2.id AS user_id
        FROM public.profiles p2 JOIN public.job_titles jt ON jt.id = p2.job_title_id
        WHERE lower(jt.name) IN ('cfo','ceo') AND jt.active AND p2.deleted_at IS NULL
        ORDER BY lower(jt.name), p2.created_at
      LOOP
        IF NOT (u.user_id = ANY(seen)) AND (final_id IS NULL OR u.user_id <> final_id) THEN
          INSERT INTO public.approval_steps (order_id, step_index, role_label, approver_id)
          VALUES (NEW.id, dual_idx, CASE WHEN u.title_name = 'cfo' THEN 'Dupla aprovação — CFO' ELSE 'Dupla aprovação — CEO' END, u.user_id);
          seen := array_append(seen, u.user_id);
          idx := dual_idx;
        END IF;
      END LOOP;
    END IF;
  END IF;

  IF final_id IS NOT NULL THEN
    idx := idx + 1;
    INSERT INTO public.approval_steps (order_id, step_index, role_label, approver_id)
    VALUES (NEW.id, idx, final_lbl, final_id);
  END IF;

  IF idx = 0 THEN
    UPDATE public.purchase_orders SET approval_status = 'aprovado', approved_at = COALESCE(approved_at, now()) WHERE id = NEW.id AND approval_status <> 'aprovado';
  ELSE
    UPDATE public.purchase_orders SET approval_status = 'aguardando_aprovacao' WHERE id = NEW.id AND approval_status = 'aprovado';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_order_approval_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE final_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.job_titles jt ON jt.id = p.job_title_id
    WHERE lower(jt.name) IN ('cfo','ceo') AND jt.active AND p.deleted_at IS NULL AND p.id <> NEW.requester_id
  ) INTO final_exists;
  NEW.approval_status := CASE WHEN final_exists THEN 'aguardando_aprovacao' ELSE 'aprovado' END;
  RETURN NEW;
END;
$$;