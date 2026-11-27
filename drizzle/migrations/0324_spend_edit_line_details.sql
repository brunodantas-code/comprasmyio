CREATE OR REPLACE FUNCTION public.spend_edit_line_details(_line_id uuid, _description text, _observation text, _expected_revision uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE l public.spend_lines; cid uuid; previous public.spend_logs; saved public.spend_logs; d text := btrim(coalesce(_description,'')); o text := btrim(coalesce(_observation,''));
BEGIN
 IF auth.uid() IS NULL OR public.spend_role() IS DISTINCT FROM 'finance' THEN RAISE EXCEPTION 'Somente Financeiro pode editar a descrição do lançamento'; END IF;
 SELECT * INTO l FROM public.spend_lines WHERE id=_line_id FOR UPDATE;
 IF l.id IS NULL THEN RAISE EXCEPTION 'Lançamento não encontrado'; END IF;
 SELECT card_id INTO cid FROM public.spend_statements WHERE id=l.statement_id;
 IF NOT coalesce(public.spend_card_access(cid),false) THEN RAISE EXCEPTION 'Cartão não autorizado'; END IF;
 IF l.status='approved' OR l.payable_id IS NOT NULL THEN RAISE EXCEPTION 'Lançamento aprovado não pode ser alterado'; END IF;
 IF d='' THEN RAISE EXCEPTION 'Informe a descrição'; END IF;
 SELECT * INTO previous FROM public.spend_logs WHERE card_id=cid AND action='line_description_edited' AND details->>'line_id'=l.id::text ORDER BY created_at DESC,id DESC LIMIT 1;
 IF previous.id IS DISTINCT FROM _expected_revision THEN RAISE EXCEPTION 'A descrição foi alterada por outra pessoa. Atualize a tela antes de salvar'; END IF;
 INSERT INTO public.spend_logs(card_id,actor_id,action,details) VALUES(cid,auth.uid(),'line_description_edited',jsonb_build_object('line_id',l.id,'original_description',l.merchant,'description',d,'observation',o,'previous_description',coalesce(previous.details->>'description',l.merchant),'previous_observation',coalesce(previous.details->>'observation',''),'previous_revision',previous.id)) RETURNING * INTO saved;
 RETURN to_jsonb(saved);
END $$;
REVOKE ALL ON FUNCTION public.spend_edit_line_details(uuid,text,text,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.spend_edit_line_details(uuid,text,text,uuid) TO authenticated,service_role;