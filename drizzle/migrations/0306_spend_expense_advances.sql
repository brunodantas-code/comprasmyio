CREATE TABLE public.spend_advances (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 holder_id uuid NOT NULL REFERENCES public.profiles(id),
 amount numeric(14,2) NOT NULL CHECK (amount > 0),
 paid_at date NOT NULL,
 due_at date,
 purpose text NOT NULL DEFAULT '' CHECK (length(purpose) <= 500),
 project_id uuid REFERENCES public.projects(id),
 status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','settled','closed')),
 close_kind text CHECK (close_kind IS NULL OR close_kind IN ('settled','returned','discounted')),
 close_note text NOT NULL DEFAULT '',
 closed_by uuid,
 closed_at timestamptz,
 created_by uuid NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.spend_advances TO authenticated;
GRANT ALL ON public.spend_advances TO service_role;
ALTER TABLE public.spend_advances ENABLE ROW LEVEL SECURITY;
CREATE POLICY spend_advances_read ON public.spend_advances FOR SELECT TO authenticated USING (holder_id = auth.uid() OR public.spend_role() = 'finance');

ALTER TABLE public.spend_receipts ADD COLUMN advance_id uuid REFERENCES public.spend_advances(id);
ALTER TABLE public.spend_receipts ADD COLUMN finance_account_id uuid;
ALTER TABLE public.spend_receipts ADD COLUMN finance_cost_center_id uuid;
COMMENT ON COLUMN public.spend_receipts.finance_account_id IS 'Plano de Contas definido pelo Financeiro na aprovação de comprovantes de adiantamento.';
ALTER TABLE public.spend_receipts DROP CONSTRAINT spend_receipts_payment_source_valid;
ALTER TABLE public.spend_receipts ADD CONSTRAINT spend_receipts_payment_source_valid CHECK (payment_source IN ('myio_card','reimbursement','advance'));
ALTER TABLE public.spend_receipts ADD CONSTRAINT spend_receipts_advance_link CHECK ((payment_source = 'advance') = (advance_id IS NOT NULL));
CREATE INDEX spend_receipts_advance_idx ON public.spend_receipts(advance_id) WHERE advance_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.spend_guard_advance_receipt() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $fn$
DECLARE a public.spend_advances; used numeric;
BEGIN
 IF NEW.advance_id IS NULL THEN RETURN NEW; END IF;
 SELECT * INTO a FROM public.spend_advances WHERE id=NEW.advance_id FOR UPDATE;
 IF a.id IS NULL OR a.holder_id<>NEW.holder_id THEN RAISE EXCEPTION 'Adiantamento não pertence ao colaborador'; END IF;
 IF TG_OP='UPDATE' AND OLD.advance_id IS NOT DISTINCT FROM NEW.advance_id AND OLD.amount=NEW.amount THEN RETURN NEW; END IF;
 IF a.status<>'open' THEN RAISE EXCEPTION 'Prestação de contas deste adiantamento já foi encerrada'; END IF;
 SELECT coalesce(sum(amount),0) INTO used FROM public.spend_receipts WHERE advance_id=a.id AND id<>NEW.id;
 IF used+NEW.amount>a.amount THEN RAISE EXCEPTION 'Valor ultrapassa o saldo do adiantamento (saldo R$ %). Envie o excedente como Reembolso', to_char(a.amount-used,'FM999G999G990D00'); END IF;
 RETURN NEW;
END $fn$;
REVOKE ALL ON FUNCTION public.spend_guard_advance_receipt() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER spend_guard_advance_receipt BEFORE INSERT OR UPDATE OF advance_id,amount,holder_id ON public.spend_receipts FOR EACH ROW EXECUTE FUNCTION public.spend_guard_advance_receipt();

CREATE OR REPLACE FUNCTION public.spend_advance(_action text, _data jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $fn$
DECLARE a public.spend_advances; rc public.spend_receipts; used numeric; card uuid;
BEGIN
 IF public.spend_role() IS DISTINCT FROM 'finance' THEN RAISE EXCEPTION 'Somente Financeiro ou Admin gerenciam adiantamentos'; END IF;
 IF _action='create' THEN
  IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=(_data->>'holder_id')::uuid AND is_active AND deleted_at IS NULL) THEN RAISE EXCEPTION 'Colaborador inválido'; END IF;
  INSERT INTO public.spend_advances(holder_id,amount,paid_at,due_at,purpose,project_id,created_by)
  VALUES((_data->>'holder_id')::uuid,(_data->>'amount')::numeric,(_data->>'paid_at')::date,nullif(_data->>'due_at','')::date,coalesce(btrim(_data->>'purpose'),''),nullif(_data->>'project_id','')::uuid,auth.uid()) RETURNING * INTO a;
  SELECT id INTO card FROM public.spend_cards WHERE holder_id=a.holder_id ORDER BY active DESC LIMIT 1;
  IF card IS NOT NULL THEN INSERT INTO public.spend_logs(card_id,actor_id,action,details) VALUES(card,auth.uid(),'advance_created',to_jsonb(a)); END IF;
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
  INSERT INTO public.spend_logs(card_id,actor_id,action,details) VALUES(rc.card_id,auth.uid(),'advance_'||_action,jsonb_build_object('receipt_id',rc.id,'advance_id',a.id,'data',_data));
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
  SELECT id INTO card FROM public.spend_cards WHERE holder_id=a.holder_id ORDER BY active DESC LIMIT 1;
  IF card IS NOT NULL THEN INSERT INTO public.spend_logs(card_id,actor_id,action,details) VALUES(card,auth.uid(),'advance_closed',to_jsonb(a)); END IF;
  RETURN to_jsonb(a);
 END IF;
 RAISE EXCEPTION 'Ação inválida';
END $fn$;
REVOKE ALL ON FUNCTION public.spend_advance(text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.spend_advance(text,jsonb) TO authenticated;

DO $migration$
DECLARE d text; original text; anchor text;
BEGIN
 SELECT pg_get_functiondef('public.spend_action(text,jsonb)'::regprocedure) INTO d; original:=d;
 d:=replace(d,$a$NOT IN ('myio_card','reimbursement') THEN RAISE EXCEPTION 'Informe se pagou com Cartão myio ou se é Reembolso'$a$,$a$NOT IN ('myio_card','reimbursement','advance') THEN RAISE EXCEPTION 'Informe Cartão myio, Reembolso ou Adiantamento'$a$);
 d:=replace(d,$a$IF coalesce(_data->>'payment_source',receipt.payment_source)='reimbursement' AND receipt.id IS NOT NULL THEN$a$,$a$IF coalesce(_data->>'payment_source',receipt.payment_source)<>'myio_card' AND receipt.id IS NOT NULL THEN$a$);
 d:=replace(d,'access_key,payment_source) VALUES(','access_key,payment_source,advance_id) VALUES(');
 anchor:=$a$coalesce(_data->>'payment_source',receipt.payment_source)) ON CONFLICT(id) DO UPDATE SET payment_source=excluded.payment_source,status=CASE WHEN excluded.payment_source='reimbursement' THEN 'pending' ELSE spend_receipts.status END,$a$;
 IF strpos(d,anchor)=0 THEN RAISE EXCEPTION 'Advance insert anchor missing'; END IF;
 d:=replace(d,anchor,$a$coalesce(_data->>'payment_source',receipt.payment_source),CASE WHEN coalesce(_data->>'payment_source',receipt.payment_source)='advance' THEN coalesce(nullif(_data->>'advance_id','')::uuid,receipt.advance_id) END) ON CONFLICT(id) DO UPDATE SET payment_source=excluded.payment_source,advance_id=excluded.advance_id,status=CASE WHEN excluded.payment_source<>'myio_card' THEN 'pending' ELSE spend_receipts.status END,$a$);
 IF d=original OR strpos(d,'advance_id) VALUES(')=0 OR strpos(d,'''reimbursement'',''advance''')=0 THEN RAISE EXCEPTION 'Advance migration incomplete'; END IF;
 EXECUTE d;
 SELECT pg_get_functiondef('public.spend_workspace()'::regprocedure) INTO d; original:=d;
 d:=replace(d,$a$,'statements',$a$,$a$,'advances',coalesce((SELECT jsonb_agg(to_jsonb(v) ORDER BY v.paid_at DESC) FROM public.spend_advances v WHERE v.holder_id=auth.uid() OR r='finance'),'[]'),'statements',$a$);
 IF d=original THEN RAISE EXCEPTION 'Workspace anchor missing'; END IF;
 EXECUTE d;
END $migration$;