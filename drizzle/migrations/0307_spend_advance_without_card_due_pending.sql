ALTER TABLE public.spend_receipts ALTER COLUMN card_id DROP NOT NULL;
ALTER TABLE public.spend_receipt_analyses ALTER COLUMN card_id DROP NOT NULL;
ALTER TABLE public.spend_logs ALTER COLUMN card_id DROP NOT NULL;

UPDATE public.spend_receipt_analyses a SET card_id=NULL FROM public.spend_receipts r WHERE r.file_path=a.file_path AND r.payment_source='advance';
UPDATE public.spend_receipts SET card_id=NULL WHERE payment_source='advance';
ALTER TABLE public.spend_receipts ADD CONSTRAINT spend_receipts_card_independence CHECK ((payment_source='advance' AND card_id IS NULL) OR (payment_source<>'advance' AND card_id IS NOT NULL));
COMMENT ON COLUMN public.spend_receipts.card_id IS 'Obrigatório para cartão/reembolso; sempre nulo em adiantamentos, que são créditos em conta do colaborador.';

DROP POLICY spend_receipts_read ON public.spend_receipts;
CREATE POLICY spend_receipts_read ON public.spend_receipts FOR SELECT TO authenticated USING ((card_id IS NOT NULL AND public.spend_card_access(card_id)) OR (payment_source='advance' AND (holder_id=auth.uid() OR public.spend_role()='finance')));
DROP POLICY spend_logs_read ON public.spend_logs;
CREATE POLICY spend_logs_read ON public.spend_logs FOR SELECT TO authenticated USING (public.spend_card_access(card_id) OR EXISTS(SELECT 1 FROM public.spend_advances a WHERE a.id::text=details->>'advance_id' AND (a.holder_id=auth.uid() OR public.spend_role()='finance')));
DROP POLICY spend_receipt_analysis_read ON public.spend_receipt_analyses;
CREATE POLICY spend_receipt_analysis_read ON public.spend_receipt_analyses FOR SELECT TO authenticated USING (public.spend_storage_access(file_path) AND (card_id IS NULL OR public.spend_card_access(card_id)));

CREATE OR REPLACE FUNCTION public.spend_storage_access(_name text) RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $fn$
BEGIN
 IF split_part(_name,'/',1)='advances' THEN
  RETURN split_part(_name,'/',3) ~ '^[0-9]{4}-[0-9]{2}$' AND EXISTS(SELECT 1 FROM public.spend_advances a WHERE a.id::text=split_part(_name,'/',2) AND (a.holder_id=auth.uid() OR public.spend_role()='finance'));
 END IF;
 RETURN EXISTS(SELECT 1 FROM public.spend_cards c WHERE c.company_key::text=split_part(_name,'/',1) AND c.id::text=split_part(_name,'/',3) AND split_part(_name,'/',2) ~ '^[0-9]{4}-[0-9]{2}$' AND (public.spend_card_access(c.id) OR (public.spend_card_delegate(c.id) AND NOT EXISTS(SELECT 1 FROM storage.objects o WHERE o.bucket_id='spend-files' AND o.name=_name AND o.owner_id IS DISTINCT FROM auth.uid()::text))));
END $fn$;

CREATE OR REPLACE FUNCTION public.spend_pending_advances(_all boolean DEFAULT false) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $fn$
DECLARE result jsonb;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sessão necessária' USING ERRCODE='42501'; END IF;
 IF _all AND NOT coalesce(public.is_access_admin(auth.uid()),false) THEN RAISE EXCEPTION 'Acesso exclusivo para Admin' USING ERRCODE='42501'; END IF;
 SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.due_at,x.advance_id),'[]'::jsonb) INTO result FROM (
  SELECT a.id AS advance_id,a.holder_id,a.due_at,a.purpose,a.amount,a.amount-coalesce(sum(r.amount),0) AS remaining,p.full_name AS requester_name
  FROM public.spend_advances a
  LEFT JOIN public.spend_receipts r ON r.advance_id=a.id
  LEFT JOIN public.profiles p ON p.id=a.created_by
  WHERE a.status='open' AND a.due_at IS NOT NULL AND a.due_at<(now() AT TIME ZONE 'America/Sao_Paulo')::date AND (_all OR a.holder_id=auth.uid())
  GROUP BY a.id,p.full_name
  HAVING a.amount-coalesce(sum(r.amount),0)>0
 ) x;
 RETURN result;
END $fn$;
REVOKE ALL ON FUNCTION public.spend_pending_advances(boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.spend_pending_advances(boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.spend_advance(_action text, _data jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $fn$
DECLARE a public.spend_advances; rc public.spend_receipts; used numeric;
BEGIN
 IF public.spend_role() IS DISTINCT FROM 'finance' THEN RAISE EXCEPTION 'Somente Financeiro ou Admin gerenciam adiantamentos'; END IF;
 IF _action='create' THEN
  IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=(_data->>'holder_id')::uuid AND is_active AND deleted_at IS NULL) THEN RAISE EXCEPTION 'Colaborador inválido'; END IF;
  INSERT INTO public.spend_advances(holder_id,amount,paid_at,due_at,purpose,project_id,created_by)
  VALUES((_data->>'holder_id')::uuid,(_data->>'amount')::numeric,(_data->>'paid_at')::date,nullif(_data->>'due_at','')::date,coalesce(btrim(_data->>'purpose'),''),nullif(_data->>'project_id','')::uuid,auth.uid()) RETURNING * INTO a;
  INSERT INTO public.spend_logs(card_id,actor_id,action,details) VALUES(NULL,auth.uid(),'advance_created',jsonb_build_object('advance_id',a.id,'advance',to_jsonb(a)));
  RETURN to_jsonb(a);
 END IF;
 IF _action IN ('approve_receipt','reopen_receipt') THEN
  SELECT * INTO rc FROM public.spend_receipts WHERE id=(_data->>'receipt_id')::uuid FOR UPDATE;
  IF rc.id IS NULL OR rc.payment_source<>'advance' THEN RAISE EXCEPTION 'Comprovante não pertence a um adiantamento'; END IF;
  SELECT * INTO a FROM public.spend_advances WHERE id=rc.advance_id FOR UPDATE;
  IF a.status<>'open' THEN RAISE EXCEPTION 'Prestação de contas já encerrada'; END IF;
  IF _action='approve_receipt' THEN
   IF nullif(_data->>'account_id','') IS NULL OR nullif(_data->>'cost_center_id','') IS NULL THEN RAISE EXCEPTION 'Informe Plano de Contas e Centro de Custo'; END IF;
   UPDATE public.spend_receipts SET status='approved',finance_account_id=(_data->>'account_id')::uuid,finance_cost_center_id=(_data->>'cost_center_id')::uuid WHERE id=rc.id;
  ELSE
   UPDATE public.spend_receipts SET status='pending' WHERE id=rc.id;
  END IF;
  INSERT INTO public.spend_logs(card_id,actor_id,action,details) VALUES(NULL,auth.uid(),'advance_'||_action,jsonb_build_object('receipt_id',rc.id,'advance_id',a.id,'data',_data));
  RETURN jsonb_build_object('ok',true);
 END IF;
 IF _action='close' THEN
  SELECT * INTO a FROM public.spend_advances WHERE id=(_data->>'advance_id')::uuid FOR UPDATE;
  IF a.id IS NULL OR a.status<>'open' THEN RAISE EXCEPTION 'Adiantamento indisponível'; END IF;
  IF EXISTS(SELECT 1 FROM public.spend_receipts WHERE advance_id=a.id AND status<>'approved') THEN RAISE EXCEPTION 'Aprove ou devolva os comprovantes pendentes antes de encerrar'; END IF;
  SELECT coalesce(sum(amount),0) INTO used FROM public.spend_receipts WHERE advance_id=a.id;
  IF used<a.amount AND coalesce(_data->>'close_kind','') NOT IN ('returned','discounted') THEN RAISE EXCEPTION 'Informe se o saldo foi devolvido ou descontado'; END IF;
  IF used<a.amount AND btrim(coalesce(_data->>'note',''))='' THEN RAISE EXCEPTION 'Descreva a devolução ou o desconto do saldo'; END IF;
  UPDATE public.spend_advances SET status=CASE WHEN used>=a.amount THEN 'settled' ELSE 'closed' END,close_kind=CASE WHEN used>=a.amount THEN 'settled' ELSE _data->>'close_kind' END,close_note=coalesce(btrim(_data->>'note'),''),closed_by=auth.uid(),closed_at=now() WHERE id=a.id RETURNING * INTO a;
  INSERT INTO public.spend_logs(card_id,actor_id,action,details) VALUES(NULL,auth.uid(),'advance_closed',jsonb_build_object('advance_id',a.id,'advance',to_jsonb(a)));
  RETURN to_jsonb(a);
 END IF;
 RAISE EXCEPTION 'Ação inválida';
END $fn$;

CREATE OR REPLACE FUNCTION public.spend_delete_receipt(_receipt_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $fn$
DECLARE r public.spend_receipts; linked jsonb;
BEGIN
 IF auth.uid() IS NULL OR public.spend_role() IS NULL THEN RAISE EXCEPTION 'Acesso não autorizado'; END IF;
 PERFORM id FROM public.spend_lines WHERE receipt_id=_receipt_id ORDER BY id FOR UPDATE;
 SELECT * INTO r FROM public.spend_receipts WHERE id=_receipt_id FOR UPDATE;
 IF r.id IS NULL OR r.holder_id IS DISTINCT FROM auth.uid() OR (r.payment_source<>'advance' AND NOT public.spend_card_access(r.card_id)) THEN RAISE EXCEPTION 'Somente o portador pode excluir seu comprovante'; END IF;
 IF r.status='approved' OR EXISTS(SELECT 1 FROM public.spend_lines WHERE receipt_id=r.id AND (status='approved' OR payable_id IS NOT NULL)) THEN RAISE EXCEPTION 'Comprovante aprovado não pode ser excluído'; END IF;
 IF r.reimbursement_order_id IS NOT NULL OR EXISTS(SELECT 1 FROM public.purchase_orders WHERE r.id=ANY(spend_receipt_ids)) THEN RAISE EXCEPTION 'Comprovante já solicitado no Supply não pode ser excluído'; END IF;
 SELECT coalesce(jsonb_agg(to_jsonb(l)),'[]'::jsonb) INTO linked FROM public.spend_lines l WHERE receipt_id=r.id;
 UPDATE public.spend_lines SET receipt_id=NULL,status='pending',myio_cnpj=NULL WHERE receipt_id=r.id;
 INSERT INTO public.spend_logs(card_id,actor_id,action,details) VALUES(r.card_id,auth.uid(),'receipt_deleted',jsonb_build_object('receipt_id',r.id,'advance_id',r.advance_id,'before',to_jsonb(r),'lines_before',linked));
 DELETE FROM public.spend_receipts WHERE id=r.id;
 RETURN jsonb_build_object('ok',true,'receipt_id',r.id);
END $fn$;

DO $migration$
DECLARE d text; original text; anchor text;
BEGIN
 SELECT pg_get_functiondef('public.spend_action(text,jsonb)'::regprocedure) INTO d; original:=d;
 d:=replace(d,'receipt public.spend_receipts; v jsonb;','receipt public.spend_receipts; a public.spend_advances; source text; holder uuid; v jsonb;');
 anchor:=$a$IF (receipt.holder_id IS DISTINCT FROM auth.uid() AND r<>'finance') OR receipt.card_id IS DISTINCT FROM (_data->>'card_id')::uuid THEN RAISE EXCEPTION 'Somente o portador pode editar seu comprovante'; END IF;$a$;
 IF strpos(d,anchor)=0 THEN RAISE EXCEPTION 'Receipt owner guard not found'; END IF;
 d:=replace(d,anchor,$a$IF receipt.holder_id IS DISTINCT FROM auth.uid() AND r<>'finance' THEN RAISE EXCEPTION 'Somente o portador pode editar seu comprovante'; END IF;$a$);
 anchor:=$a$SELECT * INTO c FROM public.spend_cards WHERE id=(_data->>'card_id')::uuid AND active; IF c.id IS NULL OR NOT (public.spend_card_access(c.id) OR (receipt.id IS NULL AND public.spend_card_delegate(c.id) AND _data->>'payment_source'='myio_card')) THEN RAISE EXCEPTION 'Cartão não autorizado'; END IF;
 IF coalesce(_data->>'payment_source',receipt.payment_source,'') NOT IN ('myio_card','reimbursement','advance') THEN RAISE EXCEPTION 'Informe Cartão myio, Reembolso ou Adiantamento'; END IF;$a$;
 IF strpos(d,anchor)=0 THEN RAISE EXCEPTION 'Receipt card guard not found'; END IF;
 d:=replace(d,anchor,$a$source:=coalesce(_data->>'payment_source',receipt.payment_source,'');
 IF source NOT IN ('myio_card','reimbursement','advance') THEN RAISE EXCEPTION 'Informe Cartão myio, Reembolso ou Adiantamento'; END IF;
 IF source='advance' THEN
  SELECT * INTO a FROM public.spend_advances WHERE id=coalesce(nullif(_data->>'advance_id','')::uuid,receipt.advance_id);
  IF a.id IS NULL OR (a.holder_id<>auth.uid() AND r<>'finance') THEN RAISE EXCEPTION 'Adiantamento não autorizado'; END IF;
  holder:=a.holder_id;
 ELSE
  SELECT * INTO c FROM public.spend_cards WHERE id=nullif(_data->>'card_id','')::uuid AND active;
  IF c.id IS NULL OR NOT (public.spend_card_access(c.id) OR (receipt.id IS NULL AND public.spend_card_delegate(c.id) AND source='myio_card')) THEN RAISE EXCEPTION 'Cartão não autorizado'; END IF;
  holder:=c.holder_id;
 END IF;$a$);
 anchor:=$a$IF NOT public.spend_storage_access(path) OR split_part(path,'/',3)<>c.id::text OR NOT EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='spend-files' AND name=path AND (r='finance' OR owner_id=auth.uid()::text)) THEN RAISE EXCEPTION 'Comprovante não autorizado'; END IF;$a$;
 IF strpos(d,anchor)=0 THEN RAISE EXCEPTION 'Receipt storage guard not found'; END IF;
 d:=replace(d,anchor,$a$IF NOT public.spend_storage_access(path) OR NOT EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='spend-files' AND name=path AND (r='finance' OR owner_id=auth.uid()::text)) OR (source='advance' AND path IS DISTINCT FROM receipt.file_path AND (split_part(path,'/',1)<>'advances' OR split_part(path,'/',2)<>a.id::text)) OR (source<>'advance' AND split_part(path,'/',3)<>c.id::text) THEN RAISE EXCEPTION 'Comprovante não autorizado'; END IF;$a$);
 d:=replace(d,'VALUES((_data->>''id'')::uuid,c.id,c.holder_id,','VALUES((_data->>''id'')::uuid,c.id,holder,');
 d:=replace(d,'ON CONFLICT(id) DO UPDATE SET payment_source=','ON CONFLICT(id) DO UPDATE SET card_id=excluded.card_id,holder_id=excluded.holder_id,payment_source=');
 d:=replace(d,'spend_receipts.card_id=excluded.card_id','spend_receipts.card_id IS NOT DISTINCT FROM excluded.card_id');
 d:=replace(d,'jsonb_build_object(''receipt_id'',rid,''before'',to_jsonb(receipt),''after'',_data)','jsonb_build_object(''receipt_id'',rid,''advance_id'',a.id,''before'',to_jsonb(receipt),''after'',_data)');
 d:=replace(d,'jsonb_build_object(''receipt_id'',rid,''myio_cnpj''','jsonb_build_object(''receipt_id'',rid,''advance_id'',a.id,''myio_cnpj''');
 IF d=original OR strpos(d,'source:=')=0 OR strpos(d,'c.id,holder,')=0 OR strpos(d,'card_id=excluded.card_id')=0 THEN RAISE EXCEPTION 'Advance independence patch incomplete'; END IF;
 EXECUTE d;

 SELECT pg_get_functiondef('public.spend_workspace()'::regprocedure) INTO d; original:=d;
 d:=replace(d,$a$FROM public.spend_receipts x WHERE public.spend_card_access(x.card_id) OR (x.submitted_by=auth.uid() AND public.spend_card_delegate(x.card_id)))$a$,$a$FROM public.spend_receipts x WHERE public.spend_card_access(x.card_id) OR (x.submitted_by=auth.uid() AND public.spend_card_delegate(x.card_id)) OR (x.payment_source='advance' AND (x.holder_id=auth.uid() OR r='finance')))$a$);
 d:=replace(d,$a$FROM public.spend_logs x WHERE public.spend_card_access(x.card_id))$a$,$a$FROM public.spend_logs x WHERE public.spend_card_access(x.card_id) OR EXISTS(SELECT 1 FROM public.spend_advances a WHERE a.id::text=x.details->>'advance_id' AND (a.holder_id=auth.uid() OR r='finance')))$a$);
 IF d=original OR strpos(d,'x.payment_source=''advance''')=0 OR strpos(d,'x.details->>''advance_id''')=0 THEN RAISE EXCEPTION 'Workspace advance patch incomplete'; END IF;
 EXECUTE d;
END $migration$;
