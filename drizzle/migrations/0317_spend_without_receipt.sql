ALTER TABLE public.spend_receipts ADD COLUMN without_receipt boolean NOT NULL DEFAULT false;
ALTER TABLE public.spend_receipts ADD CONSTRAINT spend_receipts_without_receipt_scope CHECK (NOT without_receipt OR (payment_source<>'myio_card' AND file_path='no-receipt/'||id::text));
COMMENT ON COLUMN public.spend_receipts.without_receipt IS 'Despesa registrada manualmente sem comprovante; Financeiro pode questionar o portador.';
CREATE OR REPLACE FUNCTION public.spend_guard_receipt_analysis() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $g$
BEGIN
 IF NEW.without_receipt THEN RETURN NEW; END IF;
 PERFORM public.spend_assert_receipt_analysis(NEW.file_path,NEW.amount,NEW.date);
 RETURN NEW;
END $g$;
DO $do$
DECLARE d text; o text[]; n text[]; i int;
BEGIN
 d:=pg_get_functiondef('public.spend_action(text,jsonb)'::regprocedure);
 o:=ARRAY[
  $a$path text; BEGIN$a$,
  $a$ cat:=_data->>'category'; path:=_data->>'file_path';$a$,
  $a$ IF NOT public.spend_storage_access(path) OR NOT EXISTS$a$,
  $a$ IF source='advance' AND path IS DISTINCT$a$,
  $a$ IF c.id IS NOT NULL AND split_part(path,'/',3)$a$,
  $a$ IF c.id IS NULL AND (split_part(path,'/',1)<>'reimbursement'$a$,
  $a$payment_source,advance_id) VALUES((_data->>'id')::uuid$a$,
  $a$coalesce(nullif(_data->>'advance_id','')::uuid,receipt.advance_id) END) ON CONFLICT(id) DO UPDATE SET$a$,
  $a$'confirmed',true,'category',cat$a$];
 n:=ARRAY[
  $a$path text; wr boolean:=false; BEGIN$a$,
  $a$ cat:=_data->>'category'; path:=_data->>'file_path'; wr:=coalesce((_data->>'without_receipt')::boolean,false);
 IF wr THEN IF source='myio_card' THEN RAISE EXCEPTION 'Despesa sem comprovante só pode ser Reembolso ou Adiantamento'; END IF; IF trim(coalesce(_data->>'observation',''))='' THEN RAISE EXCEPTION 'Explique por que não há comprovante'; END IF; path:='no-receipt/'||(_data->>'id'); END IF;$a$,
  $a$ IF NOT wr AND NOT public.spend_storage_access(path) OR NOT wr AND NOT EXISTS$a$,
  $a$ IF NOT wr AND source='advance' AND path IS DISTINCT$a$,
  $a$ IF NOT wr AND c.id IS NOT NULL AND split_part(path,'/',3)$a$,
  $a$ IF NOT wr AND c.id IS NULL AND (split_part(path,'/',1)<>'reimbursement'$a$,
  $a$payment_source,advance_id,without_receipt) VALUES((_data->>'id')::uuid$a$,
  $a$coalesce(nullif(_data->>'advance_id','')::uuid,receipt.advance_id) END,wr) ON CONFLICT(id) DO UPDATE SET without_receipt=excluded.without_receipt,$a$,
  $a$'confirmed',true,'without_receipt',wr,'category',cat$a$];
 FOR i IN 1..array_length(o,1) LOOP
  IF (length(d)-length(replace(d,o[i],'')))/length(o[i])<>1 THEN RAISE EXCEPTION 'trecho % não encontrado uma vez', i; END IF;
  d:=replace(d,o[i],n[i]);
 END LOOP;
 EXECUTE d;
END $do$;