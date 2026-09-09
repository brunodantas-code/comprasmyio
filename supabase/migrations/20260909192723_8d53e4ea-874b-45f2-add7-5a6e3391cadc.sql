CREATE OR REPLACE FUNCTION public.decide_approval_step(_step_id uuid, _decision text, _comment text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  s RECORD;
  pending_count integer;
  who text;
  note text;
BEGIN
  SELECT * INTO s FROM public.approval_steps WHERE id = _step_id;
  IF s IS NULL THEN RAISE EXCEPTION 'Etapa não encontrada'; END IF;
  IF s.status <> 'pendente' THEN RAISE EXCEPTION 'Etapa já decidida'; END IF;
  IF _decision NOT IN ('aprovado','rejeitado') THEN RAISE EXCEPTION 'Decisão inválida'; END IF;

  IF NOT (s.approver_id = auth.uid() OR public.can_manage_limits(auth.uid())) THEN
    RAISE EXCEPTION 'Sem permissão para decidir esta etapa';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.approval_steps
    WHERE order_id = s.order_id AND status = 'pendente' AND step_index < s.step_index
  ) THEN
    RAISE EXCEPTION 'Existe etapa anterior pendente';
  END IF;

  IF _decision = 'rejeitado' AND COALESCE(btrim(_comment), '') = '' THEN
    RAISE EXCEPTION 'Informe o motivo da rejeição';
  END IF;

  UPDATE public.approval_steps
     SET status = _decision, comment = _comment, decided_at = now(), decided_by = auth.uid()
   WHERE id = _step_id;

  INSERT INTO public.order_logs (order_id, actor_id, action, details)
  VALUES (s.order_id, auth.uid(), _decision,
          jsonb_build_object('etapa', s.role_label, 'comentario', _comment));

  IF _decision = 'rejeitado' THEN
    SELECT COALESCE(NULLIF(btrim(full_name), ''), email, 'Aprovador') INTO who
      FROM public.profiles WHERE id = auth.uid();

    note := 'Rejeitado por ' || COALESCE(who, 'Aprovador') || ' (' || s.role_label || ') em '
            || to_char(now() AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI') || ': ' || btrim(_comment);

    UPDATE public.purchase_orders
       SET approval_status = 'rejeitado',
           buyer_notes = CASE
             WHEN COALESCE(btrim(buyer_notes), '') = '' THEN note
             ELSE buyer_notes || E'\n' || note
           END
     WHERE id = s.order_id;
  ELSE
    SELECT count(*) INTO pending_count FROM public.approval_steps
      WHERE order_id = s.order_id AND status = 'pendente';
    IF pending_count = 0 THEN
      UPDATE public.purchase_orders
         SET approval_status = 'aprovado', approved_by = auth.uid(), approved_at = now()
       WHERE id = s.order_id;
    END IF;
  END IF;
END;
$function$;