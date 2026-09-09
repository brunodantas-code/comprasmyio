CREATE OR REPLACE FUNCTION public.build_approval_chain()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  p RECORD;
  v numeric := COALESCE(NEW.estimated_value, 0);
  levels integer := 0;
  labels text[] := ARRAY['Gestor Direto','Gerente da Área','Diretor do Departamento','C-Level'];
  cur uuid;
  nxt uuid;
  i integer;
  idx integer := 0;
  r RECORD;
  cfg RECORD;
  dual_idx integer;
  u RECORD;
  is_c boolean;
  c_role text;
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

  IF v <= COALESCE(p.approval_limit, 0) THEN
    levels := 0;
  ELSIF v <= COALESCE(p.tier2_limit, 50000) THEN
    levels := 2;
  ELSIF v <= COALESCE(p.tier3_limit, 250000) THEN
    levels := 3;
  ELSE
    levels := 4;
  END IF;

  IF levels = 0 THEN
    RETURN NEW;
  END IF;

  cur := NEW.requester_id;
  i := 1;
  WHILE i <= levels LOOP
    SELECT manager_id INTO nxt FROM public.profiles WHERE id = cur;
    EXIT WHEN nxt IS NULL;

    SELECT ur.role::text INTO c_role
    FROM public.user_roles ur
    WHERE ur.user_id = nxt AND ur.role IN ('ceo','coo','cfo','cto')
    ORDER BY ur.created_at
    LIMIT 1;
    is_c := c_role IS NOT NULL;

    IF is_c THEN
      lbl := 'C-Level — ' || upper(c_role);
    ELSE
      lbl := labels[i];
    END IF;

    idx := idx + 1;
    INSERT INTO public.approval_steps (order_id, step_index, role_label, approver_id)
    VALUES (NEW.id, idx, lbl, nxt);

    -- chegou no C-Level: encerra a cadeia hierárquica
    EXIT WHEN is_c;

    cur := nxt;
    i := i + 1;
  END LOOP;

  FOR r IN SELECT * FROM public.approval_rules WHERE active ORDER BY position, created_at LOOP
    idx := idx + 1;
    INSERT INTO public.approval_steps (order_id, step_index, role_label, approver_id)
    VALUES (NEW.id, idx, r.name, r.approver_id);
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
      INSERT INTO public.approval_steps (order_id, step_index, role_label, approver_id)
      VALUES (NEW.id, dual_idx, CASE WHEN u.role = 'cfo' THEN 'Dupla aprovação — CFO' ELSE 'Dupla aprovação — CEO' END, u.user_id);
      idx := dual_idx;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$function$;