CREATE OR REPLACE FUNCTION public.spend_set_statement_due(_statement_id uuid, _due_date date)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s public.spend_statements; np date;
BEGIN
  IF public.spend_role() IS DISTINCT FROM 'finance' THEN RAISE EXCEPTION 'Acesso não autorizado'; END IF;
  IF _due_date IS NULL THEN RAISE EXCEPTION 'Informe o vencimento'; END IF;
  SELECT * INTO s FROM public.spend_statements WHERE id=_statement_id FOR UPDATE;
  IF s.id IS NULL THEN RAISE EXCEPTION 'Fatura não encontrada'; END IF;
  np := date_trunc('month', _due_date)::date;
  IF EXISTS(SELECT 1 FROM public.spend_statements WHERE card_id=s.card_id AND period=np AND id<>s.id) THEN RAISE EXCEPTION 'Já existe fatura deste cartão nesse mês'; END IF;
  UPDATE public.spend_statements SET period=np, due_date=_due_date WHERE id=s.id;
  INSERT INTO public.spend_logs(card_id,actor_id,action,details) VALUES(s.card_id,auth.uid(),'statement_due',jsonb_build_object('statement_id',s.id,'old_period',s.period,'old_due_date',s.due_date,'period',np,'due_date',_due_date));
  RETURN jsonb_build_object('ok',true,'period',np);
END $$;
REVOKE ALL ON FUNCTION public.spend_set_statement_due(uuid,date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.spend_set_statement_due(uuid,date) TO authenticated;