CREATE OR REPLACE FUNCTION public.spend_delete_receipt(_receipt_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $f$
DECLARE r public.spend_receipts; linked jsonb;
BEGIN
 IF auth.uid() IS NULL OR public.spend_role() IS NULL THEN RAISE EXCEPTION 'Acesso não autorizado'; END IF;
 PERFORM id FROM public.spend_lines WHERE receipt_id=_receipt_id ORDER BY id FOR UPDATE;
 SELECT * INTO r FROM public.spend_receipts WHERE id=_receipt_id FOR UPDATE;
 IF r.id IS NULL OR r.holder_id IS DISTINCT FROM auth.uid() OR NOT public.spend_card_access(r.card_id) THEN RAISE EXCEPTION 'Somente o portador pode excluir seu comprovante'; END IF;
 IF r.status='approved' OR EXISTS(SELECT 1 FROM public.spend_lines WHERE receipt_id=r.id AND (status='approved' OR payable_id IS NOT NULL)) THEN RAISE EXCEPTION 'Comprovante aprovado não pode ser excluído'; END IF;
 IF r.reimbursement_order_id IS NOT NULL OR EXISTS(SELECT 1 FROM public.purchase_orders WHERE r.id=ANY(spend_receipt_ids)) THEN RAISE EXCEPTION 'Comprovante já solicitado no Supply não pode ser excluído'; END IF;
 SELECT coalesce(jsonb_agg(to_jsonb(l)),'[]'::jsonb) INTO linked FROM public.spend_lines l WHERE receipt_id=r.id;
 UPDATE public.spend_lines SET receipt_id=NULL,status='pending',myio_cnpj=NULL WHERE receipt_id=r.id;
 INSERT INTO public.spend_logs(card_id,actor_id,action,details) VALUES(r.card_id,auth.uid(),'receipt_deleted',jsonb_build_object('receipt_id',r.id,'before',to_jsonb(r),'lines_before',linked));
 DELETE FROM public.spend_receipts WHERE id=r.id;
 RETURN jsonb_build_object('ok',true,'receipt_id',r.id);
END $f$;
REVOKE ALL ON FUNCTION public.spend_delete_receipt(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.spend_delete_receipt(uuid) TO authenticated;