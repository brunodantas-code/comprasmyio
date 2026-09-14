ALTER TABLE public.approval_rules
  ADD COLUMN IF NOT EXISTS request_types text[] NOT NULL DEFAULT ARRAY[]::text[];

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

    FOR r IN SELECT * FROM public.approval_rules WHERE active AND (request_types IS NULL OR cardinality(request_types) = 0 OR NEW.request_type = ANY(request_types)) ORDER BY position, created_at LOOP
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
