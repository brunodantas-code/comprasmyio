CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;
REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.decide_approval_step(_step_id uuid, _decision text, _comment text DEFAULT NULL::text)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  s public.approval_steps%ROWTYPE;
  next_pending integer;
BEGIN
  IF _decision NOT IN ('aprovado','rejeitado') THEN
    RAISE EXCEPTION 'Decisão inválida';
  END IF;
  IF _decision = 'rejeitado' AND COALESCE(trim(_comment), '') = '' THEN
    RAISE EXCEPTION 'Informe o motivo da rejeição';
  END IF;

  SELECT * INTO s FROM public.approval_steps WHERE id = _step_id FOR UPDATE;
  IF s.id IS NULL THEN RAISE EXCEPTION 'Etapa não encontrada'; END IF;
  IF s.status <> 'pendente' THEN RAISE EXCEPTION 'Etapa já decidida'; END IF;
  IF NOT (s.approver_id = auth.uid() OR public.can_manage_limits(auth.uid())) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;

  UPDATE public.approval_steps
    SET status = _decision, comment = _comment, decided_at = now(), decided_by = auth.uid()
    WHERE id = _step_id;

  INSERT INTO public.order_logs(order_id, actor_id, action, details)
  VALUES (s.order_id, auth.uid(), _decision, jsonb_build_object('comentario', _comment, 'etapa', s.role_label));

  IF _decision = 'rejeitado' THEN
    UPDATE public.purchase_orders SET approval_status = 'rejeitado' WHERE id = s.order_id;
    UPDATE public.approval_steps SET status = 'cancelado'
      WHERE order_id = s.order_id AND status = 'pendente' AND id <> _step_id;
    RETURN;
  END IF;

  SELECT count(*) INTO next_pending FROM public.approval_steps
    WHERE order_id = s.order_id AND status = 'pendente';
  IF next_pending = 0 THEN
    UPDATE public.purchase_orders
      SET approval_status = 'aprovado', approved_by = auth.uid(), approved_at = now()
      WHERE id = s.order_id;
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.decide_approval_step(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.decide_approval_step(uuid, text, text) TO authenticated, service_role;