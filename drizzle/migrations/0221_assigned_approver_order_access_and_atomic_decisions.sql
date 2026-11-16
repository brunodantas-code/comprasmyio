CREATE OR REPLACE FUNCTION public.is_assigned_order_approver(_order_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.approval_steps s
    WHERE s.order_id = _order_id AND s.approver_id = auth.uid()
  );
$$;
REVOKE ALL ON FUNCTION public.is_assigned_order_approver(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_assigned_order_approver(uuid) TO authenticated, service_role;

CREATE POLICY orders_select_assigned_approver
ON public.purchase_orders FOR SELECT TO authenticated
USING (public.is_assigned_order_approver(id));

CREATE POLICY purchase_order_items_select_assigned_approver
ON public.purchase_order_items FOR SELECT TO authenticated
USING (public.is_assigned_order_approver(order_id));

CREATE POLICY logs_select_assigned_approver
ON public.order_logs FOR SELECT TO authenticated
USING (public.is_assigned_order_approver(order_id));

CREATE OR REPLACE FUNCTION public.decide_approval_step(_step_id uuid, _decision text, _comment text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s public.approval_steps%ROWTYPE;
  o public.purchase_orders%ROWTYPE;
  actor uuid := auth.uid();
BEGIN
  IF actor IS NULL THEN RAISE EXCEPTION 'Sessão não encontrada'; END IF;
  IF _decision IS NULL OR _decision NOT IN ('aprovado', 'rejeitado') THEN
    RAISE EXCEPTION 'Decisão inválida';
  END IF;
  IF _decision = 'rejeitado' AND COALESCE(trim(_comment), '') = '' THEN
    RAISE EXCEPTION 'Informe o motivo da rejeição';
  END IF;

  SELECT * INTO s FROM public.approval_steps WHERE id = _step_id;
  IF s.id IS NULL THEN RAISE EXCEPTION 'Etapa não encontrada'; END IF;
  IF NOT (COALESCE(s.approver_id = actor, false) OR public.can_manage_limits(actor)) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;

  SELECT * INTO o FROM public.purchase_orders WHERE id = s.order_id FOR UPDATE;
  IF o.id IS NULL THEN RAISE EXCEPTION 'Solicitação não encontrada'; END IF;
  SELECT * INTO s FROM public.approval_steps WHERE id = _step_id FOR UPDATE;
  IF s.id IS NULL THEN RAISE EXCEPTION 'Etapa não encontrada'; END IF;
  IF NOT (COALESCE(s.approver_id = actor, false) OR public.can_manage_limits(actor)) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;
  IF o.requester_id = actor THEN RAISE EXCEPTION 'Não é permitido aprovar ou rejeitar a própria solicitação'; END IF;
  IF s.status <> 'pendente' THEN RAISE EXCEPTION 'Etapa já decidida'; END IF;
  IF o.status = 'cancelado' OR o.approval_status <> 'aguardando_aprovacao' THEN
    RAISE EXCEPTION 'Solicitação não está aguardando aprovação';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.approval_steps earlier
    WHERE earlier.order_id = s.order_id AND earlier.step_index < s.step_index AND earlier.status = 'pendente'
  ) THEN RAISE EXCEPTION 'Aguarde a decisão das etapas anteriores'; END IF;

  UPDATE public.approval_steps
  SET status = _decision, comment = NULLIF(trim(_comment), ''), decided_at = now(), decided_by = actor
  WHERE id = s.id;
  INSERT INTO public.order_logs(order_id, actor_id, action, details)
  VALUES (s.order_id, actor, _decision, jsonb_build_object('comentario', NULLIF(trim(_comment), ''), 'etapa', s.role_label));

  IF _decision = 'rejeitado' THEN
    UPDATE public.purchase_orders SET approval_status = 'rejeitado' WHERE id = s.order_id;
    UPDATE public.approval_steps SET status = 'cancelado'
    WHERE order_id = s.order_id AND status = 'pendente' AND id <> s.id;
  ELSIF NOT EXISTS (SELECT 1 FROM public.approval_steps WHERE order_id = s.order_id AND status = 'pendente') THEN
    UPDATE public.purchase_orders
    SET approval_status = 'aprovado', approved_by = actor, approved_at = now()
    WHERE id = s.order_id;
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.decide_approval_step(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.decide_approval_step(uuid, text, text) TO authenticated, service_role;