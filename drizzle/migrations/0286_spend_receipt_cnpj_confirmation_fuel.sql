ALTER TABLE public.spend_receipts ADD COLUMN myio_cnpj boolean;
COMMENT ON COLUMN public.spend_receipts.myio_cnpj IS 'Indica se o comprovante identifica o CNPJ da myio como consumidor; sugerido pelo OCR e confirmado pelo usuário.';
DO $migration$
DECLARE d text; old_list text := '''alimentacao'',''transporte'',''estacionamento'',''pedagio'',''ferramentas'',''insumos'',''servicos'',''ia'',''software'',''outros'''; new_list text := '''alimentacao'',''transporte'',''estacionamento'',''pedagio'',''combustivel'',''ferramentas'',''insumos'',''servicos'',''ia'',''software'',''outros''';
BEGIN
 SELECT pg_get_functiondef('public.spend_action(text,jsonb)'::regprocedure) INTO d;
 IF strpos(d,old_list)=0 THEN RAISE EXCEPTION 'Lista de categorias não localizada'; END IF;
 d:=replace(d,old_list,new_list);
 IF strpos(d,'cat:=_data->>''category''; path:=_data->>''file_path'';')=0 THEN RAISE EXCEPTION 'Entrada do comprovante não localizada'; END IF;
 d:=replace(d,'cat:=_data->>''category''; path:=_data->>''file_path'';','cat:=_data->>''category''; path:=_data->>''file_path'';
 IF coalesce((_data->>''confirmed'')::boolean,false) IS NOT TRUE THEN RAISE EXCEPTION ''Confirme todas as informações antes de salvar''; END IF;
 IF NOT (_data ? ''myio_cnpj'') OR (_data->>''myio_cnpj'')::boolean IS NULL THEN RAISE EXCEPTION ''Confirme Com ou Sem CNPJ myio''; END IF;');
 IF strpos(d,'INSERT INTO public.spend_receipts(id,card_id,holder_id,date,merchant,amount,category,observation,project_id,file_path,clear_photo)')=0 THEN RAISE EXCEPTION 'Gravação do comprovante não localizada'; END IF;
 d:=replace(d,'INSERT INTO public.spend_receipts(id,card_id,holder_id,date,merchant,amount,category,observation,project_id,file_path,clear_photo) VALUES((_data->>''id'')::uuid,c.id,c.holder_id,(_data->>''date'')::date,_data->>''merchant'',(_data->>''amount'')::numeric,cat,coalesce(_data->>''observation'',''''),nullif(_data->>''project_id'','''')::uuid,path,coalesce((_data->>''clear_photo'')::boolean,false))','INSERT INTO public.spend_receipts(id,card_id,holder_id,date,merchant,amount,category,observation,project_id,file_path,clear_photo,myio_cnpj) VALUES((_data->>''id'')::uuid,c.id,c.holder_id,(_data->>''date'')::date,_data->>''merchant'',(_data->>''amount'')::numeric,cat,coalesce(_data->>''observation'',''''),nullif(_data->>''project_id'','''')::uuid,path,coalesce((_data->>''clear_photo'')::boolean,false),(_data->>''myio_cnpj'')::boolean)');
 d:=replace(d,'''receipt'',jsonb_build_object(''receipt_id'',rid)','''receipt'',jsonb_build_object(''receipt_id'',rid,''myio_cnpj'',(_data->>''myio_cnpj'')::boolean,''confirmed'',true)');
 IF strpos(d,'SET receipt_id=rid,status=''matched'',category=receipt.category')=0 THEN RAISE EXCEPTION 'Conciliação automática não localizada'; END IF;
 d:=replace(d,'SET receipt_id=rid,status=''matched'',category=receipt.category','SET receipt_id=rid,status=''matched'',myio_cnpj=receipt.myio_cnpj,category=receipt.category');
 IF strpos(d,'SET receipt_id=receipt.id,receipt_not_applicable=false,category=receipt.category')=0 THEN RAISE EXCEPTION 'Vínculo manual não localizado'; END IF;
 d:=replace(d,'SET receipt_id=receipt.id,receipt_not_applicable=false,category=receipt.category','SET receipt_id=receipt.id,receipt_not_applicable=false,myio_cnpj=receipt.myio_cnpj,category=receipt.category');
 EXECUTE d;
END $migration$;
REVOKE ALL ON FUNCTION public.spend_action(text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.spend_action(text,jsonb) TO authenticated;