
-- recompute approval status on value/quantity change too
DROP TRIGGER IF EXISTS trg_set_order_approval_status ON public.purchase_orders;
CREATE TRIGGER trg_set_order_approval_status
BEFORE INSERT OR UPDATE OF estimated_value, quantity, requester_id ON public.purchase_orders
FOR EACH ROW EXECUTE FUNCTION public.set_order_approval_status();

-- rebuild chain on insert and whenever the value changes (only if nothing decided yet)
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
    idx := idx + 1;
    INSERT INTO public.approval_steps (order_id, step_index, role_label, approver_id)
    VALUES (NEW.id, idx, labels[i], nxt);
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

DROP TRIGGER IF EXISTS trg_build_approval_chain ON public.purchase_orders;
CREATE TRIGGER trg_build_approval_chain
AFTER INSERT OR UPDATE OF estimated_value, quantity, requester_id ON public.purchase_orders
FOR EACH ROW EXECUTE FUNCTION public.build_approval_chain();

-- fix Bruno's order: value stored was unit price, total is 2 x 838,50
UPDATE public.purchase_orders
SET estimated_value = 1677.00
WHERE id = 'c6de2c5d-e82a-4a63-aaed-928ff55c9b82';
