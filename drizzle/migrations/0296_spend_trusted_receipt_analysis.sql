CREATE TABLE public.spend_receipt_analyses (
 file_path text PRIMARY KEY,
 card_id uuid NOT NULL REFERENCES public.spend_cards(id),
 object_id uuid NOT NULL,
 analyzed_by uuid NOT NULL REFERENCES public.profiles(id),
 amount numeric(14,2) NOT NULL CHECK(amount>0),
 document_date date NOT NULL,
 merchant text NOT NULL,
 content_hash text NOT NULL,
 result jsonb NOT NULL,
 analyzed_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.spend_receipt_analyses TO authenticated;
GRANT ALL ON public.spend_receipt_analyses TO service_role;
ALTER TABLE public.spend_receipt_analyses ENABLE ROW LEVEL SECURITY;
CREATE POLICY spend_receipt_analysis_read ON public.spend_receipt_analyses FOR SELECT TO authenticated USING (public.spend_card_access(card_id) AND public.spend_storage_access(file_path));
CREATE OR REPLACE FUNCTION public.spend_receipt_file_version(_path text) RETURNS uuid LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $fn$
DECLARE v uuid;
BEGIN
 IF auth.uid() IS NULL OR NOT public.spend_storage_access(_path) THEN RAISE EXCEPTION 'Comprovante não autorizado'; END IF;
 SELECT id INTO v FROM storage.objects WHERE bucket_id='spend-files' AND name=_path;
 IF v IS NULL THEN RAISE EXCEPTION 'Comprovante indisponível'; END IF;
 RETURN v;
END $fn$;
REVOKE ALL ON FUNCTION public.spend_receipt_file_version(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.spend_receipt_file_version(text) TO authenticated;
CREATE OR REPLACE FUNCTION public.spend_receipt_analysis_matches(_path text,_amount numeric,_date date) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $fn$
 SELECT EXISTS(SELECT 1 FROM public.spend_receipt_analyses a JOIN storage.objects o ON o.id=a.object_id AND o.bucket_id='spend-files' AND o.name=a.file_path WHERE a.file_path=_path AND a.amount=_amount AND abs(a.document_date-_date)<=2)
$fn$;
REVOKE ALL ON FUNCTION public.spend_receipt_analysis_matches(text,numeric,date) FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION public.spend_assert_receipt_analysis(_path text,_amount numeric,_date date) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $fn$
DECLARE a public.spend_receipt_analyses;
BEGIN
 SELECT x.* INTO a FROM public.spend_receipt_analyses x JOIN storage.objects o ON o.id=x.object_id AND o.bucket_id='spend-files' AND o.name=x.file_path WHERE x.file_path=_path;
 IF a.file_path IS NULL THEN RAISE EXCEPTION 'Analise o comprovante antes de salvar, conciliar ou aprovar'; END IF;
 IF a.amount IS DISTINCT FROM _amount THEN RAISE EXCEPTION 'Valor divergente: comprovante R$ %, lançamento R$ %. Selecione o comprovante correto',replace(to_char(a.amount,'FM999999999990.00'),'.',','),replace(to_char(_amount,'FM999999999990.00'),'.',','); END IF;
 IF _date IS NULL OR abs(a.document_date-_date)>2 THEN RAISE EXCEPTION 'Data divergente: comprovante %, lançamento %. A tolerância é de 2 dias',to_char(a.document_date,'DD/MM/YYYY'),to_char(_date,'DD/MM/YYYY'); END IF;
END $fn$;
REVOKE ALL ON FUNCTION public.spend_assert_receipt_analysis(text,numeric,date) FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION public.spend_guard_receipt_analysis() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $fn$
BEGIN
 PERFORM public.spend_assert_receipt_analysis(NEW.file_path,NEW.amount,NEW.date);
 RETURN NEW;
END $fn$;
REVOKE ALL ON FUNCTION public.spend_guard_receipt_analysis() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER spend_guard_receipt_analysis BEFORE INSERT OR UPDATE OF file_path,amount,date ON public.spend_receipts FOR EACH ROW EXECUTE FUNCTION public.spend_guard_receipt_analysis();
CREATE OR REPLACE FUNCTION public.spend_guard_card_receipt() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $fn$
DECLARE receipt public.spend_receipts;
BEGIN
 IF NEW.receipt_id IS NOT NULL THEN
  SELECT * INTO receipt FROM public.spend_receipts WHERE id=NEW.receipt_id FOR UPDATE;
  IF receipt.payment_source IS DISTINCT FROM 'myio_card' THEN RAISE EXCEPTION 'Reembolso não pode ser conciliado com fatura de cartão'; END IF;
  PERFORM public.spend_assert_receipt_analysis(receipt.file_path,NEW.amount,NEW.date);
 END IF;
 RETURN NEW;
END $fn$;
DO $migration$
DECLARE d text; anchor text;
BEGIN
 SELECT pg_get_functiondef('public.spend_action(text,jsonb)'::regprocedure) INTO d;
 anchor:='x.payment_source=''myio_card'' AND x.card_id=c.id AND x.holder_id=c.holder_id AND x.amount=l.amount';
 IF strpos(d,anchor)=0 THEN RAISE EXCEPTION 'Automatic matching anchor missing'; END IF;
 d:=replace(d,anchor,anchor||' AND public.spend_receipt_analysis_matches(x.file_path,l.amount,l.date)');
 anchor:='IF l.receipt_id IS NULL AND NOT l.receipt_not_applicable THEN RAISE EXCEPTION ''Anexe o comprovante ou salve Não se aplica antes de aprovar''; END IF;';
 IF strpos(d,anchor)=0 THEN RAISE EXCEPTION 'Approval receipt anchor missing'; END IF;
 d:=replace(d,anchor,anchor||$patch$
 IF l.receipt_id IS NOT NULL THEN PERFORM public.spend_assert_receipt_analysis((SELECT file_path FROM public.spend_receipts WHERE id=l.receipt_id),l.amount,l.date); END IF;$patch$);
 EXECUTE d;
END $migration$;