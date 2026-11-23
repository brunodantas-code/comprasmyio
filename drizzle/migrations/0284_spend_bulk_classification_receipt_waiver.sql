ALTER TABLE public.spend_lines ADD COLUMN receipt_not_applicable boolean NOT NULL DEFAULT false;
CREATE OR REPLACE FUNCTION public.spend_save_classification(_data jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE l public.spend_lines; s public.spend_statements; a uuid:=nullif(_data->>'account_id','')::uuid; c uuid:=nullif(_data->>'cost_center_id','')::uuid; p uuid:=nullif(_data->>'project_id','')::uuid; ids uuid[]; sid uuid; n integer:=0; result jsonb:='[]';
BEGIN
 IF auth.uid() IS NULL OR public.spend_role() IS DISTINCT FROM 'finance' THEN RAISE EXCEPTION 'Somente Financeiro'; END IF;
 IF _data ? 'line_ids' THEN
  SELECT array_agg(DISTINCT value::uuid) INTO ids FROM jsonb_array_elements_text(_data->'line_ids');
 ELSE ids:=ARRAY[(_data->>'line_id')::uuid]; END IF;
 IF coalesce(cardinality(ids),0)=0 OR cardinality(ids)>1000 THEN RAISE EXCEPTION 'Selecione de 1 a 1000 lançamentos'; END IF;
 SELECT statement_id INTO sid FROM public.spend_lines WHERE id=ids[1];
 SELECT * INTO s FROM public.spend_statements WHERE id=sid FOR UPDATE;
 IF s.id IS NULL OR NOT public.spend_card_access(s.card_id) THEN RAISE EXCEPTION 'Fatura não autorizada'; END IF;
 IF (SELECT count(*) FROM public.spend_lines WHERE id=ANY(ids) AND statement_id=sid)<>cardinality(ids) THEN RAISE EXCEPTION 'Selecione lançamentos da mesma fatura'; END IF;
 IF a IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.cash_flow_accounts x WHERE x.id=a AND x.active AND x.accepts_entries AND NOT EXISTS(SELECT 1 FROM public.cash_flow_accounts y WHERE y.parent_id=x.id AND y.active)) THEN RAISE EXCEPTION 'Selecione conta contábil válida'; END IF;
 IF c IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.cost_centers WHERE id=c AND active) THEN RAISE EXCEPTION 'Selecione Centro de Custo válido'; END IF;
 IF p IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.projects WHERE id=p AND status='active' AND public.spend_project_allowed(id)) THEN RAISE EXCEPTION 'Projeto não autorizado ou inativo'; END IF;
 FOR l IN SELECT * FROM public.spend_lines WHERE id=ANY(ids) ORDER BY id FOR UPDATE LOOP
  IF l.status='approved' THEN RAISE EXCEPTION 'Lançamento aprovado não pode ser alterado'; END IF;
  IF coalesce((_data->>'receipt_not_applicable')::boolean,false) AND l.receipt_id IS NOT NULL THEN RAISE EXCEPTION 'Lançamento com comprovante não pode ser dispensado'; END IF;
  UPDATE public.spend_lines SET account_id=a,cost_center_id=c,project_id=p,
   myio_cnpj=CASE WHEN l.receipt_id IS NULL THEN NULL WHEN _data ? 'myio_cnpj' THEN (_data->>'myio_cnpj')::boolean ELSE myio_cnpj END,
   receipt_not_applicable=CASE WHEN _data ? 'receipt_not_applicable' THEN coalesce((_data->>'receipt_not_applicable')::boolean,false) ELSE receipt_not_applicable END,
   status=CASE WHEN l.receipt_id IS NULL AND _data ? 'receipt_not_applicable' THEN CASE WHEN coalesce((_data->>'receipt_not_applicable')::boolean,false) THEN 'matched' ELSE 'pending' END ELSE status END
   WHERE id=l.id RETURNING * INTO l;
  INSERT INTO public.spend_logs(card_id,actor_id,action,details) VALUES(s.card_id,auth.uid(),'classification_saved',jsonb_build_object('line_id',l.id,'account_id',a,'cost_center_id',c,'project_id',p,'myio_cnpj',l.myio_cnpj,'receipt_not_applicable',l.receipt_not_applicable,'selection_count',cardinality(ids)));
  result:=result||jsonb_build_array(to_jsonb(l)); n:=n+1;
 END LOOP;
 IF NOT (_data ? 'line_ids') THEN RETURN result->0; END IF;
 RETURN jsonb_build_object('count',n,'lines',result);
END $$;
REVOKE ALL ON FUNCTION public.spend_save_classification(jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.spend_save_classification(jsonb) TO authenticated;
DO $$ DECLARE d text; old_guard text:='IF l.receipt_id IS NULL THEN RAISE EXCEPTION ''Anexe o comprovante ou Invoice antes de aprovar''; END IF;'; BEGIN
 SELECT pg_get_functiondef('public.spend_action(text,jsonb)'::regprocedure) INTO d;
 IF position(old_guard IN d)=0 THEN RAISE EXCEPTION 'Guarda de comprovante não encontrada'; END IF;
 d:=replace(d,old_guard,'IF l.receipt_id IS NULL AND NOT l.receipt_not_applicable THEN RAISE EXCEPTION ''Anexe o comprovante ou salve Não se aplica antes de aprovar''; END IF;');
 d:=replace(d,'receipt_id IS NULL AND status=''pending''','receipt_id IS NULL AND NOT receipt_not_applicable AND status=''pending''');
 d:=replace(d,'SET receipt_id=receipt.id,category=receipt.category,project_id=receipt.project_id,status=''matched''','SET receipt_id=receipt.id,receipt_not_applicable=false,category=receipt.category,project_id=receipt.project_id,status=''matched''');
 EXECUTE d;
END $$;