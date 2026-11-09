CREATE TABLE public.reimbursement_accounts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL,
 name text NOT NULL,
 details jsonb NOT NULL,
 active boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.reimbursement_accounts TO authenticated;
GRANT ALL ON public.reimbursement_accounts TO service_role;
ALTER TABLE public.reimbursement_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY reimbursement_accounts_owner ON public.reimbursement_accounts FOR ALL TO authenticated USING (user_id=auth.uid()) WITH CHECK (user_id=auth.uid());
ALTER TABLE public.purchase_orders ADD COLUMN reimbursement_account_id uuid REFERENCES public.reimbursement_accounts(id);
CREATE TABLE public.reimbursement_destinations (
 order_id uuid PRIMARY KEY REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
 account_id uuid NOT NULL REFERENCES public.reimbursement_accounts(id),
 details jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.reimbursement_destinations TO authenticated;
GRANT ALL ON public.reimbursement_destinations TO service_role;
ALTER TABLE public.reimbursement_destinations ENABLE ROW LEVEL SECURITY;
CREATE POLICY reimbursement_destination_authorized ON public.reimbursement_destinations FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.purchase_orders o WHERE o.id=order_id AND (o.requester_id=auth.uid() OR public.is_access_admin(auth.uid()) OR public.can_manage_cash_flow(auth.uid()) OR EXISTS (SELECT 1 FROM public.approval_steps s WHERE s.order_id=o.id AND s.approver_id=auth.uid()))));
CREATE FUNCTION public.snapshot_reimbursement_destination() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE a public.reimbursement_accounts;
BEGIN
 IF NEW.reimbursement_account_id IS NULL THEN RETURN NEW; END IF;
 SELECT * INTO a FROM public.reimbursement_accounts WHERE id=NEW.reimbursement_account_id AND user_id=NEW.requester_id AND active;
 IF NOT FOUND THEN RAISE EXCEPTION 'Conta de reembolso inválida ou inativa'; END IF;
 IF NEW.request_model IS DISTINCT FROM 'reembolso' THEN RAISE EXCEPTION 'Conta destinada somente a reembolso'; END IF;
 INSERT INTO public.reimbursement_destinations(order_id,account_id,details) VALUES(NEW.id,a.id,a.details || jsonb_build_object('name',a.name));
 RETURN NEW;
END $$;
CREATE TRIGGER snapshot_reimbursement_destination AFTER INSERT ON public.purchase_orders FOR EACH ROW EXECUTE FUNCTION public.snapshot_reimbursement_destination();
CREATE FUNCTION public.guard_reimbursement_account() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF length(trim(NEW.name))<2 OR length(NEW.name)>100 OR jsonb_typeof(NEW.details) IS DISTINCT FROM 'object' OR NEW.details->>'person_type' NOT IN ('PF','PJ') OR NEW.details->>'method' NOT IN ('pix','bank') OR length(trim(coalesce(NEW.details->>'holder','')))<2 THEN RAISE EXCEPTION 'Preencha nome, titular, PF/PJ e forma de pagamento'; END IF;
 IF NEW.details->>'method'='pix' AND length(trim(coalesce(NEW.details->>'pix_key','')))<3 THEN RAISE EXCEPTION 'Informe a chave PIX'; END IF;
 IF NEW.details->>'method'='bank' AND (length(trim(coalesce(NEW.details->>'bank','')))=0 OR length(trim(coalesce(NEW.details->>'agency','')))=0 OR length(trim(coalesce(NEW.details->>'account','')))=0) THEN RAISE EXCEPTION 'Informe banco, agência e conta'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER guard_reimbursement_account BEFORE INSERT OR UPDATE ON public.reimbursement_accounts FOR EACH ROW EXECUTE FUNCTION public.guard_reimbursement_account();