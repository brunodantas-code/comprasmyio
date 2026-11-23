ALTER TABLE public.spend_receipts ADD COLUMN city text, ADD COLUMN uf text, ADD COLUMN access_key text;
ALTER TABLE public.spend_receipts ADD CONSTRAINT spend_receipt_city_length CHECK (city IS NULL OR length(city)<=120), ADD CONSTRAINT spend_receipt_uf_valid CHECK (uf IS NULL OR uf IN ('AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO')), ADD CONSTRAINT spend_receipt_key_format CHECK (access_key IS NULL OR access_key ~ '^[0-9]{44}$');
DO $migration$
DECLARE d text; old_columns text := 'file_path,clear_photo,myio_cnpj) VALUES'; old_values text := '(_data->>''myio_cnpj'')::boolean) ON CONFLICT(id)'; old_update text := 'myio_cnpj=excluded.myio_cnpj WHERE spend_receipts';
BEGIN
 SELECT pg_get_functiondef('public.spend_action(text,jsonb)'::regprocedure) INTO d;
 IF strpos(d,old_columns)=0 OR strpos(d,old_values)=0 OR strpos(d,old_update)=0 THEN RAISE EXCEPTION 'Gravação do comprovante não localizada'; END IF;
 d:=replace(d,old_columns,'file_path,clear_photo,myio_cnpj,city,uf,access_key) VALUES');
 d:=replace(d,old_values,'(_data->>''myio_cnpj'')::boolean,nullif(btrim(_data->>''city''),''''),nullif(upper(btrim(_data->>''uf'')),''''),nullif(btrim(_data->>''access_key''),'''')) ON CONFLICT(id)');
 d:=replace(d,old_update,'myio_cnpj=excluded.myio_cnpj,city=CASE WHEN _data ? ''city'' THEN excluded.city ELSE spend_receipts.city END,uf=CASE WHEN _data ? ''uf'' THEN excluded.uf ELSE spend_receipts.uf END,access_key=CASE WHEN _data ? ''access_key'' THEN excluded.access_key ELSE spend_receipts.access_key END WHERE spend_receipts');
 EXECUTE d;
END $migration$;
REVOKE ALL ON FUNCTION public.spend_action(text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.spend_action(text,jsonb) TO authenticated;
COMMENT ON COLUMN public.spend_receipts.city IS 'Cidade do estabelecimento no comprovante, revisada pelo portador; não inferida somente da chave.';
COMMENT ON COLUMN public.spend_receipts.uf IS 'UF do estabelecimento, sugerida pelo OCR ou código cUF da chave fiscal válida.';
COMMENT ON COLUMN public.spend_receipts.access_key IS 'Chave de acesso NF-e/NFC-e identificada no comprovante e preservada para conferência.';