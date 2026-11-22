ALTER TABLE public.spend_lines ADD COLUMN myio_cnpj boolean;
CREATE OR REPLACE FUNCTION public.spend_save_classification(_data jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE l public.spend_lines; s public.spend_statements; a uuid:=nullif(_data->>'account_id','')::uuid; c uuid:=nullif(_data->>'cost_center_id','')::uuid; p uuid:=nullif(_data->>'project_id','')::uuid;
BEGIN
 IF auth.uid() IS NULL OR public.spend_role() IS DISTINCT FROM 'finance' THEN RAISE EXCEPTION 'Somente Financeiro'; END IF;
 SELECT * INTO l FROM public.spend_lines WHERE id=(_data->>'line_id')::uuid FOR UPDATE;
 IF l.id IS NULL THEN RAISE EXCEPTION 'Lançamento não encontrado'; END IF;
 SELECT * INTO s FROM public.spend_statements WHERE id=l.statement_id;
 IF NOT public.spend_card_access(s.card_id) THEN RAISE EXCEPTION 'Cartão não autorizado'; END IF;
 IF l.status='approved' THEN RAISE EXCEPTION 'Lançamento aprovado não pode ser alterado'; END IF;
 IF a IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.cash_flow_accounts x WHERE x.id=a AND x.active AND x.accepts_entries AND NOT EXISTS(SELECT 1 FROM public.cash_flow_accounts y WHERE y.parent_id=x.id AND y.active)) THEN RAISE EXCEPTION 'Selecione conta contábil válida'; END IF;
 IF c IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.cost_centers WHERE id=c AND active) THEN RAISE EXCEPTION 'Selecione Centro de Custo válido'; END IF;
 IF p IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.projects WHERE id=p AND status='active' AND public.spend_project_allowed(id)) THEN RAISE EXCEPTION 'Projeto não autorizado ou inativo'; END IF;
 UPDATE public.spend_lines SET account_id=a,cost_center_id=c,project_id=p,myio_cnpj=CASE WHEN _data ? 'myio_cnpj' THEN (_data->>'myio_cnpj')::boolean ELSE myio_cnpj END WHERE id=l.id RETURNING * INTO l;
 INSERT INTO public.spend_logs(card_id,actor_id,action,details) VALUES(s.card_id,auth.uid(),'classification_saved',jsonb_build_object('line_id',l.id,'account_id',a,'cost_center_id',c,'project_id',p,'myio_cnpj',l.myio_cnpj));
 RETURN to_jsonb(l);
END $$;
REVOKE ALL ON FUNCTION public.spend_save_classification(jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.spend_save_classification(jsonb) TO authenticated;