CREATE OR REPLACE FUNCTION public.spend_storage_access(_name text)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
 IF split_part(_name,'/',1)='advances' THEN
  RETURN split_part(_name,'/',3) ~ '^[0-9]{4}-[0-9]{2}$' AND EXISTS(SELECT 1 FROM public.spend_advances a WHERE a.id::text=split_part(_name,'/',2) AND (a.holder_id=auth.uid() OR public.spend_role()='finance'));
 END IF;
 IF split_part(_name,'/',1)='reimbursement' THEN
  RETURN split_part(_name,'/',3) ~ '^[0-9]{4}-[0-9]{2}$' AND (split_part(_name,'/',2)=auth.uid()::text OR public.spend_role()='finance');
 END IF;
 RETURN EXISTS(SELECT 1 FROM public.spend_cards c WHERE c.company_key::text=split_part(_name,'/',1) AND c.id::text=split_part(_name,'/',3) AND split_part(_name,'/',2) ~ '^[0-9]{4}-[0-9]{2}$' AND (public.spend_card_access(c.id) OR (public.spend_card_delegate(c.id) AND NOT EXISTS(SELECT 1 FROM storage.objects o WHERE o.bucket_id='spend-files' AND o.name=_name AND o.owner_id IS DISTINCT FROM auth.uid()::text))));
END
$function$;

DO $$
DECLARE def text; prev text;
BEGIN
  def := pg_get_functiondef('public.spend_action(text,jsonb)'::regprocedure);

  prev := def;
  def := replace(def,
    $q1$SELECT * INTO c FROM public.spend_cards WHERE id=nullif(_data->>'card_id','')::uuid AND active;$q1$,
    $q2$IF nullif(_data->>'card_id','') IS NULL THEN IF source<>'reimbursement' THEN RAISE EXCEPTION 'Selecione o cartão myio ou o adiantamento'; END IF; holder:=auth.uid(); ELSE SELECT * INTO c FROM public.spend_cards WHERE id=nullif(_data->>'card_id','')::uuid AND (active OR EXISTS(SELECT 1 FROM public.spend_receipts er WHERE er.id=nullif(_data->>'id','')::uuid AND er.card_id=nullif(_data->>'card_id','')::uuid));$q2$);
  IF def = prev OR position($q3$holder:=auth.uid();$q3$ in def) = 0 THEN RAISE EXCEPTION 'Ajuste do reembolso sem cartão não foi aplicado'; END IF;

  prev := def;
  def := replace(def, $q4$holder:=c.holder_id;$q4$, $q5$holder:=c.holder_id; END IF;$q5$);
  IF def = prev OR position($q6$holder:=c.holder_id; END IF;$q6$ in def) = 0 THEN RAISE EXCEPTION 'Ajuste do bloco de cartão não foi aplicado'; END IF;

  prev := def;
  def := replace(def,
    $q7$ OR (source='advance' AND path IS DISTINCT FROM receipt.file_path AND (split_part(path,'/',1)<>'advances' OR split_part(path,'/',2)<>a.id::text)) OR (source<>'advance' AND split_part(path,'/',3)<>c.id::text) THEN RAISE EXCEPTION 'Comprovante não autorizado'; END IF;$q7$,
    $q8$ THEN RAISE EXCEPTION 'Comprovante não autorizado'; END IF;
 IF source='advance' AND path IS DISTINCT FROM receipt.file_path AND (split_part(path,'/',1)<>'advances' OR split_part(path,'/',2)<>a.id::text) THEN RAISE EXCEPTION 'Comprovante não autorizado'; END IF;
 IF c.id IS NOT NULL AND split_part(path,'/',3)<>c.id::text THEN RAISE EXCEPTION 'Comprovante não autorizado'; END IF;
 IF c.id IS NULL AND (split_part(path,'/',1)<>'reimbursement' OR split_part(path,'/',2)<>auth.uid()::text) THEN RAISE EXCEPTION 'Comprovante não autorizado'; END IF;$q8$);
  IF def = prev THEN RAISE EXCEPTION 'Ajuste do arquivo do comprovante não foi aplicado'; END IF;

  EXECUTE def;

  def := pg_get_functiondef('public.spend_workspace()'::regprocedure); prev := def;
  def := replace(def,
    $q9$(x.payment_source='advance' AND (x.holder_id=auth.uid() OR r='finance'))),'[]')$q9$,
    $q10$(x.payment_source='advance' AND (x.holder_id=auth.uid() OR r='finance')) OR (x.card_id IS NULL AND x.payment_source='reimbursement' AND (x.holder_id=auth.uid() OR r='finance'))),'[]')$q10$);
  IF def = prev THEN RAISE EXCEPTION 'Ajuste da lista de comprovantes não foi aplicado'; END IF;
  EXECUTE def;

  def := pg_get_functiondef('public.spend_delete_receipt(uuid)'::regprocedure); prev := def;
  def := replace(def,
    $q11$(r.payment_source<>'advance' AND NOT public.spend_card_access(r.card_id))$q11$,
    $q12$(r.payment_source<>'advance' AND r.card_id IS NOT NULL AND NOT public.spend_card_access(r.card_id))$q12$);
  IF def = prev THEN RAISE EXCEPTION 'Ajuste da exclusão de reembolso sem cartão não foi aplicado'; END IF;
  EXECUTE def;
END $$;

DROP POLICY IF EXISTS spend_receipts_read ON public.spend_receipts;
CREATE POLICY spend_receipts_read ON public.spend_receipts FOR SELECT USING (
  (card_id IS NOT NULL AND public.spend_card_access(card_id))
  OR (payment_source = 'advance' AND (holder_id = auth.uid() OR public.spend_role() = 'finance'))
  OR (card_id IS NULL AND payment_source = 'reimbursement' AND (holder_id = auth.uid() OR public.spend_role() = 'finance'))
);