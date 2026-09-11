ALTER TABLE public.purchase_orders
  ADD COLUMN IF NOT EXISTS parent_order_id uuid REFERENCES public.purchase_orders(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS payment_date date;

DROP INDEX IF EXISTS public.purchase_orders_approval_number_key;
CREATE UNIQUE INDEX IF NOT EXISTS purchase_orders_original_approval_number_key
  ON public.purchase_orders (approval_number)
  WHERE parent_order_id IS NULL;
CREATE INDEX IF NOT EXISTS purchase_orders_parent_order_id_idx
  ON public.purchase_orders (parent_order_id);

CREATE OR REPLACE FUNCTION public.validate_payment_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  original public.purchase_orders%ROWTYPE;
BEGIN
  IF NEW.request_type <> 'pagamento' THEN
    IF NEW.parent_order_id IS NOT NULL OR NEW.payment_date IS NOT NULL THEN
      RAISE EXCEPTION 'Vínculo e data de pagamento são exclusivos de solicitações de pagamento';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.cost_center_id IS NULL THEN
    RAISE EXCEPTION 'Centro de Custo é obrigatório para pagamentos';
  END IF;
  IF NEW.payment_date IS NULL THEN
    RAISE EXCEPTION 'Data do pagamento é obrigatória';
  END IF;
  IF COALESCE(NEW.estimated_value, 0) <= 0 THEN
    RAISE EXCEPTION 'O valor do pagamento deve ser maior que zero';
  END IF;

  IF NEW.parent_order_id IS NOT NULL THEN
    SELECT * INTO original
      FROM public.purchase_orders
      WHERE id = NEW.parent_order_id;
    IF original.id IS NULL THEN
      RAISE EXCEPTION 'Approval vinculado não encontrado';
    END IF;
    IF original.request_type = 'pagamento' OR original.parent_order_id IS NOT NULL THEN
      RAISE EXCEPTION 'O pagamento deve ser vinculado ao Approval original';
    END IF;
    IF original.approval_status <> 'aprovado' THEN
      RAISE EXCEPTION 'Somente Approvals aprovados podem ser vinculados';
    END IF;
    NEW.approval_number := original.approval_number;
  END IF;

  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.validate_payment_order() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.validate_payment_order() TO service_role;

DROP TRIGGER IF EXISTS trg_validate_payment_order ON public.purchase_orders;
CREATE TRIGGER trg_validate_payment_order
BEFORE INSERT OR UPDATE OF request_type, parent_order_id, payment_date, cost_center_id, estimated_value
ON public.purchase_orders
FOR EACH ROW EXECUTE FUNCTION public.validate_payment_order();

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
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF EXISTS (SELECT 1 FROM public.approval_steps WHERE order_id = NEW.id AND status <> 'pendente') THEN
      RETURN NEW;
    END IF;
    DELETE FROM public.approval_steps WHERE order_id = NEW.id;
  END IF;

  SELECT * INTO p FROM public.profiles WHERE id = NEW.requester_id;
  IF p IS NULL THEN RETURN NEW; END IF;

  SELECT ur.user_id INTO cfo_id FROM public.user_roles ur WHERE ur.role = 'cfo' AND ur.user_id <> NEW.requester_id ORDER BY ur.created_at LIMIT 1;
  SELECT ur.user_id INTO ceo_id FROM public.user_roles ur WHERE ur.role = 'ceo' AND ur.user_id <> NEW.requester_id ORDER BY ur.created_at LIMIT 1;

  IF NEW.request_type = 'pagamento' THEN
    IF public.has_role(NEW.requester_id, 'financeiro') THEN
      IF cfo_id IS NULL THEN
        RAISE EXCEPTION 'Nenhum usuário está cadastrado no cargo CFO';
      END IF;
      INSERT INTO public.approval_steps (order_id, step_index, role_label, approver_id)
      VALUES (NEW.id, 1, 'Aprovação de Pagamento — CFO', cfo_id);
    ELSE
      added_any := false;
      FOR u IN
        SELECT DISTINCT ur.user_id
        FROM public.user_roles ur
        WHERE ur.role = 'financeiro' AND ur.user_id <> NEW.requester_id
        ORDER BY ur.user_id
      LOOP
        INSERT INTO public.approval_steps (order_id, step_index, role_label, approver_id)
        VALUES (NEW.id, 1, 'Aprovação de Pagamento — Financeiro', u.user_id);
        added_any := true;
      END LOOP;
      IF NOT added_any THEN
        RAISE EXCEPTION 'Nenhum usuário está cadastrado no cargo Financeiro';
      END IF;
    END IF;
    UPDATE public.purchase_orders
       SET approval_status = 'aguardando_aprovacao'
     WHERE id = NEW.id;
    RETURN NEW;
  END IF;

  IF cfo_id IS NOT NULL THEN
    final_id := cfo_id;
    final_lbl := 'Aprovação final — CFO';
  ELSIF ceo_id IS NOT NULL THEN
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
      FOR u IN SELECT DISTINCT ur.user_id FROM public.user_roles ur WHERE ur.role = nxt_role AND ur.user_id <> NEW.requester_id LOOP
        IF NOT (u.user_id = ANY(seen)) AND (final_id IS NULL OR u.user_id <> final_id) THEN
          idx := idx + 1;
          INSERT INTO public.approval_steps (order_id, step_index, role_label, approver_id)
          VALUES (NEW.id, idx, 'Aprovação — ' || upper(nxt_role::text), u.user_id);
          seen := array_append(seen, u.user_id);
          added_any := true;
        END IF;
      END LOOP;
      IF added_any THEN levels_used := levels_used + 1; END IF;
      cur_role := nxt_role;
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
      FOR u IN SELECT DISTINCT ON (ur.role) ur.role, ur.user_id FROM public.user_roles ur WHERE ur.role IN ('cfo','ceo') ORDER BY ur.role, ur.created_at LOOP
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
    UPDATE public.purchase_orders SET approval_status = 'aprovado', approved_at = COALESCE(approved_at, now()) WHERE id = NEW.id AND approval_status <> 'aprovado';
  ELSE
    UPDATE public.purchase_orders SET approval_status = 'aguardando_aprovacao' WHERE id = NEW.id AND approval_status = 'aprovado';
  END IF;
  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION public.build_approval_chain() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.build_approval_chain() TO service_role;

CREATE POLICY "orders_select_approved_for_payment"
ON public.purchase_orders FOR SELECT TO authenticated
USING (approval_status = 'aprovado');

INSERT INTO public.role_hierarchy (role, approver_role)
VALUES ('financeiro', 'cfo')
ON CONFLICT (role) DO UPDATE SET approver_role = EXCLUDED.approver_role, updated_at = now();