ALTER TABLE public.purchase_orders ADD COLUMN spend_receipt_ids uuid[] NOT NULL DEFAULT '{}';
ALTER TABLE public.spend_receipts ADD COLUMN reimbursement_order_id uuid REFERENCES public.purchase_orders(id) ON DELETE SET NULL;
CREATE INDEX spend_receipts_reimbursement_order ON public.spend_receipts(reimbursement_order_id) WHERE reimbursement_order_id IS NOT NULL;
COMMENT ON COLUMN public.purchase_orders.spend_receipt_ids IS 'Comprovantes pessoais de reembolso consolidados pelo Spend; vínculo imutável e auditado.';
CREATE OR REPLACE FUNCTION public.spend_reimbursement_receipts(_ids uuid[]) RETURNS SETOF public.spend_receipts LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $f$
BEGIN
 IF auth.uid() IS NULL OR cardinality(_ids) NOT BETWEEN 1 AND 100 OR cardinality(_ids)<>(SELECT count(DISTINCT x) FROM unnest(_ids) x) THEN RAISE EXCEPTION 'Selecione de 1 a 100 comprovantes distintos'; END IF;
 IF (SELECT count(*) FROM public.spend_receipts WHERE id=ANY(_ids) AND holder_id=auth.uid() AND payment_source='reimbursement' AND reimbursement_order_id IS NULL AND status<>'approved')<>cardinality(_ids) THEN RAISE EXCEPTION 'Comprovante indisponível ou já solicitado no Supply'; END IF;
 RETURN QUERY SELECT r.* FROM unnest(_ids) WITH ORDINALITY i(id,n) JOIN public.spend_receipts r ON r.id=i.id ORDER BY i.n;
END $f$;
REVOKE ALL ON FUNCTION public.spend_reimbursement_receipts(uuid[]) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.spend_reimbursement_receipts(uuid[]) TO authenticated;
CREATE OR REPLACE FUNCTION public.spend_guard_reimbursement_order() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $f$
DECLARE r public.spend_receipts; total numeric:=0; i integer:=0;
BEGIN
 IF TG_OP='UPDATE' THEN
  IF NEW.spend_receipt_ids IS DISTINCT FROM OLD.spend_receipt_ids THEN RAISE EXCEPTION 'O vínculo com os comprovantes do Spend não pode ser alterado'; END IF;
  RETURN NEW;
 END IF;
 IF cardinality(NEW.spend_receipt_ids)=0 THEN RETURN NEW; END IF;
 IF auth.uid() IS NULL OR NEW.requester_id IS DISTINCT FROM auth.uid() OR NOT public.can_request_type(auth.uid(),NEW.request_type) OR NOT EXISTS(SELECT 1 FROM public.request_types WHERE code=NEW.request_type AND model_code='reembolso' AND active) THEN RAISE EXCEPTION 'Solicitação de reembolso não permitida'; END IF;
 IF cardinality(NEW.spend_receipt_ids) NOT BETWEEN 1 AND 100 OR cardinality(NEW.spend_receipt_ids)<>(SELECT count(DISTINCT x) FROM unnest(NEW.spend_receipt_ids) x) THEN RAISE EXCEPTION 'Selecione de 1 a 100 comprovantes distintos'; END IF;
 PERFORM id FROM public.spend_receipts WHERE id=ANY(NEW.spend_receipt_ids) ORDER BY id FOR UPDATE;
 IF (SELECT count(*) FROM public.spend_receipts WHERE id=ANY(NEW.spend_receipt_ids) AND holder_id=auth.uid() AND payment_source='reimbursement' AND reimbursement_order_id IS NULL AND status<>'approved')<>cardinality(NEW.spend_receipt_ids) THEN RAISE EXCEPTION 'Comprovante indisponível ou já solicitado no Supply'; END IF;
 FOR r IN SELECT s.* FROM unnest(NEW.spend_receipt_ids) WITH ORDINALITY a(id,n) JOIN public.spend_receipts s ON s.id=a.id ORDER BY a.n LOOP
  IF (NEW.travel_legs->i->>'value')::numeric IS DISTINCT FROM r.amount OR (NEW.travel_legs->i->>'date')::date IS DISTINCT FROM r.date THEN RAISE EXCEPTION 'Valores e datas devem corresponder aos comprovantes do Spend'; END IF;
  IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(coalesce(NEW.attachments,'[]'::jsonb)) a WHERE a->>'path' LIKE auth.uid()::text||'/spend/'||r.id::text||'/%') THEN RAISE EXCEPTION 'Anexe todos os comprovantes antes de solicitar'; END IF;
  total:=total+r.amount; i:=i+1;
 END LOOP;
 IF NEW.estimated_value IS DISTINCT FROM total OR NEW.quantity<>1 OR jsonb_array_length(NEW.travel_legs)<>i THEN RAISE EXCEPTION 'O total deve corresponder às despesas selecionadas no Spend'; END IF;
 RETURN NEW;
END $f$;
REVOKE ALL ON FUNCTION public.spend_guard_reimbursement_order() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER spend_guard_reimbursement_order BEFORE INSERT OR UPDATE OF spend_receipt_ids ON public.purchase_orders FOR EACH ROW EXECUTE FUNCTION public.spend_guard_reimbursement_order();
CREATE OR REPLACE FUNCTION public.spend_link_reimbursement_order() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $f$
BEGIN
 IF cardinality(NEW.spend_receipt_ids)>0 THEN
  UPDATE public.spend_receipts SET reimbursement_order_id=NEW.id WHERE id=ANY(NEW.spend_receipt_ids);
  INSERT INTO public.spend_logs(card_id,actor_id,action,details) SELECT card_id,NEW.requester_id,'reimbursement_requested',jsonb_build_object('receipt_id',id,'order_id',NEW.id,'amount',amount) FROM public.spend_receipts WHERE id=ANY(NEW.spend_receipt_ids);
 END IF;
 RETURN NEW;
END $f$;
REVOKE ALL ON FUNCTION public.spend_link_reimbursement_order() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER spend_link_reimbursement_order AFTER INSERT ON public.purchase_orders FOR EACH ROW EXECUTE FUNCTION public.spend_link_reimbursement_order();
CREATE OR REPLACE FUNCTION public.spend_guard_submitted_receipt() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $f$
BEGIN
 IF OLD.reimbursement_order_id IS NOT NULL THEN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Comprovante vinculado ao Supply deve preservar seu histórico'; END IF;
  IF NEW.reimbursement_order_id IS NULL AND NOT EXISTS(SELECT 1 FROM public.purchase_orders WHERE id=OLD.reimbursement_order_id) THEN RETURN NEW; END IF;
  IF NEW IS DISTINCT FROM OLD THEN RAISE EXCEPTION 'Comprovante já solicitado no Supply não pode ser alterado'; END IF;
 ELSIF TG_OP='UPDATE' AND NEW.reimbursement_order_id IS NOT NULL THEN
  IF (to_jsonb(NEW)-'reimbursement_order_id') IS DISTINCT FROM (to_jsonb(OLD)-'reimbursement_order_id') OR NOT EXISTS(SELECT 1 FROM public.purchase_orders WHERE id=NEW.reimbursement_order_id AND requester_id=OLD.holder_id AND OLD.id=ANY(spend_receipt_ids)) THEN RAISE EXCEPTION 'Vínculo de reembolso inválido'; END IF;
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 RETURN NEW;
END $f$;
REVOKE ALL ON FUNCTION public.spend_guard_submitted_receipt() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER spend_guard_submitted_receipt BEFORE UPDATE OR DELETE ON public.spend_receipts FOR EACH ROW EXECUTE FUNCTION public.spend_guard_submitted_receipt();
CREATE POLICY spend_reimbursement_staged_upload ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id='order-attachments' AND (storage.foldername(name))[1]=auth.uid()::text AND (storage.foldername(name))[2]='spend' AND EXISTS(SELECT 1 FROM public.spend_receipts r WHERE r.id::text=(storage.foldername(name))[3] AND r.holder_id=auth.uid() AND r.payment_source='reimbursement' AND r.reimbursement_order_id IS NULL));
CREATE POLICY spend_reimbursement_attachment_read ON storage.objects FOR SELECT TO authenticated USING (bucket_id='order-attachments' AND (storage.foldername(name))[2]='spend' AND ((storage.foldername(name))[1]=auth.uid()::text OR EXISTS(SELECT 1 FROM public.purchase_orders o WHERE o.attachments @> jsonb_build_array(jsonb_build_object('path',name)))));
CREATE POLICY spend_reimbursement_staged_cleanup ON storage.objects FOR DELETE TO authenticated USING (bucket_id='order-attachments' AND (storage.foldername(name))[1]=auth.uid()::text AND (storage.foldername(name))[2]='spend' AND NOT EXISTS(SELECT 1 FROM public.purchase_orders o WHERE o.attachments @> jsonb_build_array(jsonb_build_object('path',name))));