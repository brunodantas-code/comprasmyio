ALTER TABLE public.spend_receipts ADD COLUMN payment_source text NOT NULL DEFAULT 'myio_card';
ALTER TABLE public.spend_receipts ADD CONSTRAINT spend_receipts_payment_source_valid CHECK (payment_source IN ('myio_card','reimbursement'));
COMMENT ON COLUMN public.spend_receipts.payment_source IS 'Forma de pagamento confirmada pelo portador: cartão myio ou reembolso em dinheiro/cartão pessoal. Card_id permanece como escopo privado de armazenamento, não evidência de pagamento.';
DO $migration$
DECLARE d text; original text; anchor text;
BEGIN
 SELECT pg_get_functiondef('public.spend_action(text,jsonb)'::regprocedure) INTO d; original:=d;
 anchor:='cat:=_data->>''category''; path:=_data->>''file_path'';';
 IF strpos(d,anchor)=0 THEN RAISE EXCEPTION 'Receipt validation anchor missing'; END IF;
 d:=replace(d,anchor,$patch$IF coalesce(_data->>'payment_source',receipt.payment_source,'') NOT IN ('myio_card','reimbursement') THEN RAISE EXCEPTION 'Informe se pagou com Cartão myio ou se é Reembolso'; END IF;
 cat:=_data->>'category'; path:=_data->>'file_path';$patch$);
 anchor:='INSERT INTO public.spend_receipts(id,card_id,holder_id,date,merchant,amount,category,observation,project_id,file_path,clear_photo,myio_cnpj,city,uf,access_key)';
 IF strpos(d,anchor)=0 THEN RAISE EXCEPTION 'Receipt insert anchor missing'; END IF;
 d:=replace(d,anchor,$patch$IF coalesce(_data->>'payment_source',receipt.payment_source)='reimbursement' AND receipt.id IS NOT NULL THEN
  INSERT INTO public.spend_logs(card_id,actor_id,action,details)
  SELECT c.id,auth.uid(),'receipt_unlinked_reimbursement',jsonb_build_object('receipt_id',receipt.id,'line_before',to_jsonb(x)) FROM public.spend_lines x WHERE x.receipt_id=receipt.id;
  UPDATE public.spend_lines SET receipt_id=NULL,status='pending',myio_cnpj=NULL WHERE receipt_id=receipt.id AND status<>'approved' AND payable_id IS NULL;
 END IF;
 INSERT INTO public.spend_receipts(id,card_id,holder_id,date,merchant,amount,category,observation,project_id,file_path,clear_photo,myio_cnpj,city,uf,access_key,payment_source)$patch$);
 anchor:='nullif(btrim(_data->>''access_key''),'''')) ON CONFLICT(id)';
 IF strpos(d,anchor)=0 THEN RAISE EXCEPTION 'Receipt value anchor missing'; END IF;
 d:=replace(d,anchor,'nullif(btrim(_data->>''access_key''),''''),coalesce(_data->>''payment_source'',receipt.payment_source)) ON CONFLICT(id)');
 anchor:='DO UPDATE SET date=excluded.date,merchant=excluded.merchant';
 IF strpos(d,anchor)=0 THEN RAISE EXCEPTION 'Receipt update anchor missing'; END IF;
 d:=replace(d,anchor,'DO UPDATE SET payment_source=excluded.payment_source,status=CASE WHEN excluded.payment_source=''reimbursement'' THEN ''pending'' ELSE spend_receipts.status END,date=excluded.date,merchant=excluded.merchant');
 d:=replace(d,'x.card_id=c.id AND x.holder_id=c.holder_id AND x.amount=l.amount','x.payment_source=''myio_card'' AND x.card_id=c.id AND x.holder_id=c.holder_id AND x.amount=l.amount');
 d:=replace(d,'IF receipt.status<>''pending'' OR EXISTS','IF receipt.payment_source<>''myio_card'' OR receipt.status<>''pending'' OR EXISTS');
 anchor:='IF receipt.card_id<>c.id OR receipt.id IS NULL';
 IF strpos(d,anchor)=0 THEN RAISE EXCEPTION 'Link anchor missing'; END IF;
 d:=replace(d,anchor,'IF receipt.payment_source IS DISTINCT FROM ''myio_card'' THEN RAISE EXCEPTION ''Reembolso não pode ser conciliado com fatura de cartão''; END IF; IF receipt.card_id<>c.id OR receipt.id IS NULL');
 anchor:='ELSIF _action=''approve'' THEN';
 d:=replace(d,anchor,$patch$ELSIF _action='approve' THEN
 IF EXISTS(SELECT 1 FROM public.spend_receipts WHERE id=l.receipt_id AND payment_source<>'myio_card') THEN RAISE EXCEPTION 'Reembolso não pode ser aprovado como despesa de cartão'; END IF;$patch$);
 d:=replace(d,'''myio_cnpj'',(_data->>''myio_cnpj'')::boolean,''confirmed'',true','''myio_cnpj'',(_data->>''myio_cnpj'')::boolean,''payment_source'',coalesce(_data->>''payment_source'',receipt.payment_source),''confirmed'',true');
 IF d=original OR strpos(d,'x.payment_source=''myio_card''')=0 THEN RAISE EXCEPTION 'Payment migration incomplete'; END IF;
 EXECUTE d;
END $migration$;
CREATE OR REPLACE FUNCTION public.spend_guard_card_receipt() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $fn$
DECLARE source text;
BEGIN
 IF NEW.receipt_id IS NOT NULL THEN
  SELECT payment_source INTO source FROM public.spend_receipts WHERE id=NEW.receipt_id FOR UPDATE;
  IF source IS DISTINCT FROM 'myio_card' THEN RAISE EXCEPTION 'Reembolso não pode ser conciliado com fatura de cartão'; END IF;
 END IF;
 RETURN NEW;
END $fn$;
REVOKE ALL ON FUNCTION public.spend_guard_card_receipt() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER spend_guard_card_receipt BEFORE INSERT OR UPDATE OF receipt_id ON public.spend_lines FOR EACH ROW EXECUTE FUNCTION public.spend_guard_card_receipt();
CREATE OR REPLACE FUNCTION public.spend_guard_payment_source() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $fn$
BEGIN
 IF NEW.payment_source IS DISTINCT FROM OLD.payment_source THEN
  IF OLD.status='approved' OR EXISTS(SELECT 1 FROM public.spend_lines WHERE receipt_id=OLD.id AND (status='approved' OR payable_id IS NOT NULL)) THEN RAISE EXCEPTION 'Comprovante aprovado não pode ser alterado'; END IF;
  IF NEW.payment_source='reimbursement' AND EXISTS(SELECT 1 FROM public.spend_lines WHERE receipt_id=OLD.id) THEN RAISE EXCEPTION 'Desvincule o comprovante da fatura antes de marcar Reembolso'; END IF;
 END IF;
 RETURN NEW;
END $fn$;
REVOKE ALL ON FUNCTION public.spend_guard_payment_source() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER spend_guard_payment_source BEFORE UPDATE OF payment_source ON public.spend_receipts FOR EACH ROW EXECUTE FUNCTION public.spend_guard_payment_source();