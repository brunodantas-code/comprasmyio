CREATE TABLE public.role_hierarchy (
  role app_role PRIMARY KEY,
  approver_role app_role,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.role_hierarchy TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.role_hierarchy TO authenticated;
GRANT ALL ON public.role_hierarchy TO service_role;

ALTER TABLE public.role_hierarchy ENABLE ROW LEVEL SECURITY;

CREATE POLICY "role_hierarchy_select" ON public.role_hierarchy
FOR SELECT TO authenticated USING (true);

CREATE POLICY "role_hierarchy_manage" ON public.role_hierarchy
FOR ALL TO authenticated
USING (public.can_manage_limits(auth.uid()))
WITH CHECK (public.can_manage_limits(auth.uid()));

CREATE TRIGGER role_hierarchy_set_updated_at
BEFORE UPDATE ON public.role_hierarchy
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.role_hierarchy (role, approver_role) VALUES
  ('solicitante','coo'),
  ('fabrica','coo'),
  ('estoquista','coo'),
  ('comprador','coo'),
  ('coo','ceo'),
  ('cto','ceo'),
  ('cfo','ceo'),
  ('ceo', NULL),
  ('admin', NULL);

CREATE OR REPLACE FUNCTION public.primary_role(_user_id uuid)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ur.role
  FROM public.user_roles ur
  WHERE ur.user_id = _user_id AND ur.role <> 'admin'
  ORDER BY ur.created_at
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.build_approval_chain()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
  cur_role app_role;
  nxt_role app_role;
  seen_roles app_role[] := '{}';
  levels_used integer := 0;
  added_any boolean;
  lbl text;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF EXISTS (SELECT 1 FROM public.approval_steps WHERE order_id = NEW.id AND status <> 'pendente') THEN
      RETURN NEW;
    END IF;
    DELETE FROM public.approval_steps WHERE order_id = NEW.id;
  END IF;

  SELECT * INTO p FROM public.profiles WHERE id = NEW.requester_id;
  IF p IS NULL THEN RETURN NEW; END IF;

  SELECT ur.user_id INTO cfo_id FROM public.user_roles ur WHERE ur.role = 'cfo' ORDER BY ur.created_at LIMIT 1;
  SELECT ur.user_id INTO ceo_id FROM public.user_roles ur WHERE ur.role = 'ceo' ORDER BY ur.created_at LIMIT 1;

  IF cfo_id IS NOT NULL AND cfo_id <> NEW.requester_id THEN
    final_id := cfo_id;
    final_lbl := 'Aprovação final — CFO';
  ELSIF ceo_id IS NOT NULL AND ceo_id <> NEW.requester_id THEN
    final_id := ceo_id;
    final_lbl := 'Aprovação final — CEO';
  ELSE
    final_id := NULL;
  END IF;

  IF v <= COALESCE(p.approval_limit, 0) THEN
    max_levels := 0;
    auto_ok := true;
  ELSIF v <= COALESCE(p.tier2_limit, 50000) THEN
    max_levels := 2;
  ELSIF v <= COALESCE(p.tier3_limit, 250000) THEN
    max_levels := 3;
  ELSE
    max_levels := 5;
  END IF;

  IF NOT auto_ok THEN
    cur_role := public.primary_role(NEW.requester_id);

    WHILE levels_used < max_levels AND hops < 12 LOOP
      hops := hops + 1;
      IF cur_role IS NULL THEN EXIT; END IF;

      SELECT rh.approver_role INTO nxt_role FROM public.role_hierarchy rh WHERE rh.role = cur_role;
      EXIT WHEN nxt_role IS NULL;
      EXIT WHEN nxt_role = ANY(seen_roles);

      seen_roles := array_append(seen_roles, nxt_role);
      added_any := false;

      FOR u IN
        SELECT DISTINCT ur.user_id
        FROM public.user_roles ur
        WHERE ur.role = nxt_role AND ur.user_id <> NEW.requester_id
      LOOP
        IF NOT (u.user_id = ANY(seen)) AND (final_id IS NULL OR u.user_id <> final_id) THEN
          idx := idx + 1;
          INSERT INTO public.approval_steps (order_id, step_index, role_label, approver_id)
          VALUES (NEW.id, idx, 'Aprovação — ' || upper(nxt_role::text), u.user_id);
          seen := array_append(seen, u.user_id);
          added_any := true;
        END IF;
      END LOOP;

      IF added_any THEN
        levels_used := levels_used + 1;
      END IF;

      cur_role := nxt_role;
    END LOOP;

    FOR r IN SELECT * FROM public.approval_rules WHERE active ORDER BY position, created_at LOOP
      IF (r.approver_id IS NULL OR NOT (r.approver_id = ANY(seen)))
         AND (final_id IS NULL OR r.approver_id IS DISTINCT FROM final_id) THEN
        idx := idx + 1;
        INSERT INTO public.approval_steps (order_id, step_index, role_label, approver_id)
        VALUES (NEW.id, idx, r.name, r.approver_id);
        IF r.approver_id IS NOT NULL THEN
          seen := array_append(seen, r.approver_id);
        END IF;
      END IF;
    END LOOP;

    SELECT * INTO cfg FROM public.approval_settings WHERE id;
    IF cfg IS NOT NULL AND cfg.dual_approval_enabled AND v > COALESCE(cfg.dual_approval_threshold, 100000) THEN
      dual_idx := idx + 1;
      FOR u IN
        SELECT DISTINCT ON (ur.role) ur.role, ur.user_id
        FROM public.user_roles ur
        WHERE ur.role IN ('cfo','ceo')
        ORDER BY ur.role, ur.created_at
      LOOP
        IF NOT (u.user_id = ANY(seen)) AND (final_id IS NULL OR u.user_id <> final_id) THEN
          INSERT INTO public.approval_steps (order_id, step_index, role_label, approver_id)
          VALUES (NEW.id, dual_idx, CASE WHEN u.role = 'cfo' THEN 'Dupla aprovação — CFO' ELSE 'Dupla aprovação — CEO' END, u.user_id);
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
    UPDATE public.purchase_orders
       SET approval_status = 'aprovado', approved_at = COALESCE(approved_at, now())
     WHERE id = NEW.id AND approval_status <> 'aprovado';
  ELSE
    UPDATE public.purchase_orders
       SET approval_status = 'aguardando_aprovacao'
     WHERE id = NEW.id AND approval_status = 'aprovado';
  END IF;

  RETURN NEW;
END;
$function$;