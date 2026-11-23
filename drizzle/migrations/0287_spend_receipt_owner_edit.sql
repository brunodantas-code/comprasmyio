DO $migration$
DECLARE d text; old_insert text; new_insert text;
BEGIN
 SELECT pg_get_functiondef('public.spend_action(text,jsonb)'::regprocedure) INTO d;
 IF strpos(d,'IF _action=''receipt'' THEN')=0 THEN RAISE EXCEPTION 'Entrada não localizada'; END IF;
 d:=replace(d,'IF _action=''receipt'' THEN', 'IF _action=''receipt'' THEN
 PERFORM 1 FROM public.spend_lines WHERE receipt_id=(_data->>''id'')::uuid ORDER BY id FOR UPDATE;
 SELECT * INTO receipt FROM public.spend_receipts WHERE id=(_data->>''id'')::uuid FOR UPDATE;
 IF receipt.id IS NOT NULL THEN
  IF receipt.holder_id IS DISTINCT FROM auth.uid() OR receipt.card_id IS DISTINCT FROM (_data->>''card_id'')::uuid THEN RAISE EXCEPTION ''Somente o portador pode editar seu comprovante''; END IF;
  IF receipt.status=''approved'' OR EXISTS(SELECT 1 FROM public.spend_lines WHERE receipt_id=receipt.id AND (status=''approved'' OR payable_id IS NOT NULL)) THEN RAISE EXCEPTION ''Comprovante aprovado não pode ser alterado''; END IF;
  IF EXISTS(SELECT 1 FROM public.spend_lines WHERE receipt_id=receipt.id) AND (receipt.amount IS DISTINCT FROM (_data->>''amount'')::numeric OR receipt.date IS DISTINCT FROM (_data->>''date'')::date) THEN RAISE EXCEPTION ''Data e valor do comprovante conciliado devem ser preservados''; END IF;
 END IF;');
 old_insert := 'ON CONFLICT(id) DO NOTHING RETURNING id INTO rid;';
 new_insert := 'ON CONFLICT(id) DO UPDATE SET date=excluded.date,merchant=excluded.merchant,amount=excluded.amount,category=excluded.category,observation=excluded.observation,project_id=excluded.project_id,file_path=excluded.file_path,clear_photo=excluded.clear_photo,myio_cnpj=excluded.myio_cnpj WHERE spend_receipts.holder_id=auth.uid() AND spend_receipts.card_id=excluded.card_id AND spend_receipts.status<>''approved'' RETURNING id INTO rid;
 IF rid IS NULL THEN RAISE EXCEPTION ''Não foi possível salvar o comprovante''; END IF;
 IF receipt.id IS NOT NULL THEN
  UPDATE public.spend_lines SET category=cat,myio_cnpj=(_data->>''myio_cnpj'')::boolean WHERE receipt_id=rid AND status<>''approved'';
  INSERT INTO public.spend_logs(card_id,actor_id,action,details) VALUES(c.id,auth.uid(),''receipt_updated'',jsonb_build_object(''receipt_id'',rid,''before'',to_jsonb(receipt),''after'',_data));
 END IF;';
 IF strpos(d,old_insert)=0 THEN RAISE EXCEPTION 'Gravação não localizada'; END IF;
 d:=replace(d,old_insert,new_insert);
 EXECUTE d;
END $migration$;
REVOKE ALL ON FUNCTION public.spend_action(text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.spend_action(text,jsonb) TO authenticated;