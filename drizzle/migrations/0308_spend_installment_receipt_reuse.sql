ALTER TABLE public.spend_lines ADD COLUMN installment_source_line_id uuid REFERENCES public.spend_lines(id) ON DELETE SET NULL;
COMMENT ON COLUMN public.spend_lines.installment_source_line_id IS 'Parcela anterior da mesma compra cujo comprovante e classificação foram reaproveitados automaticamente.';
ALTER TABLE public.spend_lines DROP CONSTRAINT spend_lines_receipt_id_key;
CREATE UNIQUE INDEX spend_lines_receipt_original_key ON public.spend_lines(receipt_id) WHERE receipt_id IS NOT NULL AND installment_source_line_id IS NULL;

CREATE OR REPLACE FUNCTION public.spend_installment_parts(_t text) RETURNS integer[] LANGUAGE sql IMMUTABLE SET search_path=public AS $fn$
 SELECT CASE WHEN m IS NULL THEN NULL ELSE ARRAY[m[1]::int,m[2]::int] END FROM (SELECT regexp_match(coalesce(_t,''),'(\d+)\s*/\s*(\d+)') m) x
$fn$;

CREATE OR REPLACE FUNCTION public.spend_same_purchase(a public.spend_lines, b public.spend_lines) RETURNS boolean LANGUAGE sql STABLE SET search_path=public AS $fn$
 SELECT a.id<>b.id AND a.date=b.date AND abs(a.amount-b.amount)<=0.05
  AND upper(btrim(regexp_replace(a.merchant,'\s+',' ','g')))=upper(btrim(regexp_replace(b.merchant,'\s+',' ','g')))
  AND (public.spend_installment_parts(a.installment))[2]=(public.spend_installment_parts(b.installment))[2]
  AND (public.spend_installment_parts(a.installment))[2]>1
  AND (public.spend_installment_parts(a.installment))[1]<>(public.spend_installment_parts(b.installment))[1]
  AND (SELECT card_id FROM public.spend_statements WHERE id=a.statement_id)=(SELECT card_id FROM public.spend_statements WHERE id=b.statement_id)
$fn$;

CREATE OR REPLACE FUNCTION public.spend_guard_card_receipt() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $fn$
DECLARE receipt public.spend_receipts;
BEGIN
 IF NEW.receipt_id IS NULL THEN NEW.installment_source_line_id:=NULL; RETURN NEW; END IF;
 SELECT * INTO receipt FROM public.spend_receipts WHERE id=NEW.receipt_id FOR UPDATE;
 IF receipt.payment_source IS DISTINCT FROM 'myio_card' THEN RAISE EXCEPTION 'Reembolso não pode ser conciliado com fatura de cartão'; END IF;
 IF NEW.installment_source_line_id IS NULL THEN PERFORM public.spend_assert_receipt_analysis(receipt.file_path,NEW.amount,NEW.date); END IF;
 RETURN NEW;
END $fn$;

CREATE OR REPLACE FUNCTION public.spend_installment_reuse() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $fn$
DECLARE src public.spend_lines; t public.spend_lines; card uuid;
BEGIN
 IF public.spend_installment_parts(NEW.installment) IS NULL THEN RETURN NULL; END IF;
 SELECT card_id INTO card FROM public.spend_statements WHERE id=NEW.statement_id;
 IF TG_OP='INSERT' AND NEW.receipt_id IS NULL THEN
  SELECT l.* INTO src FROM public.spend_lines l WHERE l.receipt_id IS NOT NULL AND l.installment_source_line_id IS NULL AND public.spend_same_purchase(l,NEW) ORDER BY (public.spend_installment_parts(l.installment))[1] DESC LIMIT 1;
  IF src.id IS NOT NULL THEN
   UPDATE public.spend_lines SET installment_source_line_id=src.id,receipt_id=src.receipt_id,receipt_not_applicable=false,status='matched',myio_cnpj=src.myio_cnpj,category=src.category,account_id=coalesce(src.account_id,account_id),cost_center_id=coalesce(src.cost_center_id,cost_center_id),project_id=coalesce(src.project_id,project_id) WHERE id=NEW.id;
   INSERT INTO public.spend_logs(card_id,actor_id,action,details) VALUES(card,auth.uid(),'installment_reuse',jsonb_build_object('line_id',NEW.id,'source_line_id',src.id,'receipt_id',src.receipt_id,'installment',NEW.installment));
  END IF;
 ELSIF TG_OP='UPDATE' AND NEW.receipt_id IS NOT NULL AND OLD.receipt_id IS NULL AND NEW.installment_source_line_id IS NULL THEN
  FOR t IN SELECT l.* FROM public.spend_lines l WHERE l.receipt_id IS NULL AND NOT l.receipt_not_applicable AND l.status='pending' AND l.payable_id IS NULL AND public.spend_same_purchase(l,NEW) LOOP
   UPDATE public.spend_lines SET installment_source_line_id=NEW.id,receipt_id=NEW.receipt_id,status='matched',myio_cnpj=NEW.myio_cnpj,category=NEW.category,account_id=coalesce(NEW.account_id,account_id),cost_center_id=coalesce(NEW.cost_center_id,cost_center_id),project_id=coalesce(NEW.project_id,project_id) WHERE id=t.id;
   INSERT INTO public.spend_logs(card_id,actor_id,action,details) VALUES(card,auth.uid(),'installment_reuse',jsonb_build_object('line_id',t.id,'source_line_id',NEW.id,'receipt_id',NEW.receipt_id,'installment',t.installment));
  END LOOP;
 END IF;
 RETURN NULL;
END $fn$;
REVOKE ALL ON FUNCTION public.spend_installment_reuse() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER spend_installment_reuse AFTER INSERT OR UPDATE OF receipt_id ON public.spend_lines FOR EACH ROW EXECUTE FUNCTION public.spend_installment_reuse();

DO $m$
DECLARE d text; anchor text;
BEGIN
 SELECT pg_get_functiondef('public.spend_action(text,jsonb)'::regprocedure) INTO d;
 anchor:=$a$IF l.receipt_id IS NOT NULL THEN PERFORM public.spend_assert_receipt_analysis($a$;
 IF strpos(d,anchor)=0 THEN RAISE EXCEPTION 'Approval evidence check not found'; END IF;
 d:=replace(d,anchor,$a$IF l.receipt_id IS NOT NULL AND l.installment_source_line_id IS NULL THEN PERFORM public.spend_assert_receipt_analysis($a$);
 EXECUTE d;
END $m$;