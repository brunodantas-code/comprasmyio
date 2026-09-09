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
  cur uuid;
  nxt uuid;
  hops integer := 0;
  idx integer := 0;
  r RECORD;
  cfg RECORD;
  dual_idx integer;
  u RECORD;
  lvl text;
  c_role text;
  lbl text;
  seen uuid[] := '{}';
  cfo_id uuid;
  ceo_id uuid;
  final_id uuid;
  final_lbl text;
  auto_ok boolean := false;
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
    cur := NEW.requester_id;
    WHILE hops < max_levels LOOP
      SELECT manager_id INTO nxt FROM public.profiles WHERE id = cur;
      EXIT WHEN nxt IS NULL;
      EXIT WHEN nxt = NEW.requester_id;

      SELECT approval_level INTO lvl FROM public.profiles WHERE id = nxt;

      SELECT ur.role::text INTO c_role
      FROM public.user_roles ur
      WHERE ur.user_id = nxt AND ur.role IN ('ceo','coo','cfo','cto')
      ORDER BY ur.created_at
      LIMIT 1;

      IF lvl = 'c_level' OR (lvl IS NULL AND c_role IS NOT NULL) THEN
        lbl := 'C-Level' || COALESCE(' — ' || upper(c_role), '');
      ELSIF lvl = 'gerente' THEN
        lbl := 'Gerente da Área';
      ELSE
        lbl := 'Gestor Direto';
      END IF;

      IF NOT (nxt = ANY(seen)) AND (final_id IS NULL OR nxt <> final_id) THEN
        idx := idx + 1;
        INSERT INTO public.approval_steps (order_id, step_index, role_label, approver_id)
        VALUES (NEW.id, idx, lbl, nxt);
        seen := array_append(seen, nxt);
      END IF;

      EXIT WHEN lbl LIKE 'C-Level%';

      cur := nxt;
      hops := hops + 1;
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

CREATE OR REPLACE FUNCTION public.set_order_approval_status()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  final_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.role IN ('cfo','ceo') AND ur.user_id <> NEW.requester_id
  ) INTO final_exists;

  IF final_exists THEN
    NEW.approval_status := 'aguardando_aprovacao';
  ELSE
    NEW.approval_status := 'aprovado';
  END IF;
  RETURN NEW;
END;
$function$;