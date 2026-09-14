ALTER TABLE public.cash_flow_payables
  ADD COLUMN fiscal_period date,
  ADD COLUMN competence_period date,
  ADD COLUMN cash_period date;

UPDATE public.cash_flow_payables
SET fiscal_period = date_trunc('month', created_at)::date,
    competence_period = date_trunc('month', created_at)::date,
    cash_period = date_trunc('month', COALESCE(paid_at, due_date, created_at::date)::timestamp)::date;

ALTER TABLE public.cash_flow_payables
  ALTER COLUMN fiscal_period SET NOT NULL,
  ALTER COLUMN competence_period SET NOT NULL,
  ALTER COLUMN cash_period SET NOT NULL,
  ADD CONSTRAINT cash_flow_payables_fiscal_period_month CHECK (fiscal_period = date_trunc('month', fiscal_period)::date),
  ADD CONSTRAINT cash_flow_payables_competence_period_month CHECK (competence_period = date_trunc('month', competence_period)::date),
  ADD CONSTRAINT cash_flow_payables_cash_period_month CHECK (cash_period = date_trunc('month', cash_period)::date);

ALTER TABLE public.cash_flow_transactions
  ADD COLUMN fiscal_period date,
  ADD COLUMN competence_period date,
  ADD COLUMN cash_period date;

UPDATE public.cash_flow_transactions
SET fiscal_period = date_trunc('month', posted_at)::date,
    competence_period = date_trunc('month', posted_at)::date,
    cash_period = date_trunc('month', posted_at)::date;

ALTER TABLE public.cash_flow_transactions
  ALTER COLUMN fiscal_period SET NOT NULL,
  ALTER COLUMN competence_period SET NOT NULL,
  ALTER COLUMN cash_period SET NOT NULL,
  ADD CONSTRAINT cash_flow_transactions_fiscal_period_month CHECK (fiscal_period = date_trunc('month', fiscal_period)::date),
  ADD CONSTRAINT cash_flow_transactions_competence_period_month CHECK (competence_period = date_trunc('month', competence_period)::date),
  ADD CONSTRAINT cash_flow_transactions_cash_period_month CHECK (cash_period = date_trunc('month', cash_period)::date);

CREATE OR REPLACE FUNCTION public.sync_approved_order_to_cash_flow()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  emission_month date;
  cash_month date;
BEGIN
  IF NEW.approval_status = 'aprovado' AND (TG_OP = 'INSERT' OR OLD.approval_status IS DISTINCT FROM 'aprovado') THEN
    emission_month := date_trunc('month', NEW.created_at)::date;
    cash_month := date_trunc('month', COALESCE(NEW.payment_date, NEW.deadline_date, NEW.created_at::date)::timestamp)::date;
    INSERT INTO public.cash_flow_payables (
      source_order_id, approval_number, request_type, item_name, requester_id,
      project_id, client_id, cost_center_id, amount, due_date,
      fiscal_period, competence_period, cash_period
    ) VALUES (
      NEW.id, NEW.approval_number, NEW.request_type, NEW.item_name, NEW.requester_id,
      NEW.project_id, NEW.client_id, NEW.cost_center_id, COALESCE(NEW.estimated_value, 0),
      COALESCE(NEW.payment_date, NEW.deadline_date), emission_month, emission_month, cash_month
    ) ON CONFLICT (source_order_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.sync_approved_order_to_cash_flow() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_approved_order_to_cash_flow() TO service_role;

CREATE OR REPLACE FUNCTION public.refresh_cash_flow_reconciliation_statuses()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_payable uuid;
  target_transaction uuid;
  payable_total numeric;
  payable_matched numeric;
  transaction_total numeric;
  transaction_matched numeric;
  transaction_date date;
BEGIN
  target_payable := COALESCE(NEW.payable_id, OLD.payable_id);
  target_transaction := COALESCE(NEW.transaction_id, OLD.transaction_id);

  SELECT amount INTO payable_total FROM public.cash_flow_payables WHERE id = target_payable;
  SELECT COALESCE(sum(matched_amount), 0) INTO payable_matched FROM public.cash_flow_reconciliations WHERE payable_id = target_payable;
  SELECT posted_at INTO transaction_date FROM public.cash_flow_transactions WHERE id = target_transaction;
  UPDATE public.cash_flow_payables SET status = CASE
    WHEN payable_matched <= 0 THEN CASE WHEN account_id IS NULL THEN 'a_classificar' ELSE 'a_pagar' END
    WHEN payable_matched < payable_total THEN 'parcialmente_conciliado'
    ELSE 'conciliado' END,
    paid_at = CASE WHEN payable_matched >= payable_total THEN COALESCE(paid_at, transaction_date, current_date) ELSE paid_at END,
    cash_period = CASE WHEN payable_matched > 0 THEN date_trunc('month', COALESCE(transaction_date, current_date)::timestamp)::date ELSE cash_period END
  WHERE id = target_payable AND status <> 'cancelado';

  SELECT abs(amount) INTO transaction_total FROM public.cash_flow_transactions WHERE id = target_transaction;
  SELECT COALESCE(sum(matched_amount), 0) INTO transaction_matched FROM public.cash_flow_reconciliations WHERE transaction_id = target_transaction;
  UPDATE public.cash_flow_transactions SET reconciliation_status = CASE
    WHEN transaction_matched <= 0 THEN 'pendente'
    WHEN transaction_matched < transaction_total THEN 'parcial'
    ELSE 'conciliado' END
  WHERE id = target_transaction AND reconciliation_status <> 'ignorado';
  RETURN COALESCE(NEW, OLD);
END;
$$;
REVOKE ALL ON FUNCTION public.refresh_cash_flow_reconciliation_statuses() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_cash_flow_reconciliation_statuses() TO service_role;

CREATE OR REPLACE FUNCTION public.log_cash_flow_payable_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.cash_flow_payable_logs(payable_id, actor_id, action, details)
    VALUES (NEW.id, auth.uid(), 'Recebido do myio supply', jsonb_build_object('status', NEW.status));
  ELSIF OLD.account_id IS DISTINCT FROM NEW.account_id THEN
    INSERT INTO public.cash_flow_payable_logs(payable_id, actor_id, action, details)
    VALUES (NEW.id, auth.uid(), 'Classificação contábil alterada', jsonb_build_object('conta_anterior', OLD.account_id, 'conta_nova', NEW.account_id));
  ELSIF OLD.fiscal_period IS DISTINCT FROM NEW.fiscal_period
     OR OLD.competence_period IS DISTINCT FROM NEW.competence_period
     OR OLD.cash_period IS DISTINCT FROM NEW.cash_period THEN
    INSERT INTO public.cash_flow_payable_logs(payable_id, actor_id, action, details)
    VALUES (NEW.id, auth.uid(), 'Classificações mensais alteradas', jsonb_build_object(
      'emissao_anterior', OLD.fiscal_period, 'emissao_nova', NEW.fiscal_period,
      'competencia_anterior', OLD.competence_period, 'competencia_nova', NEW.competence_period,
      'caixa_anterior', OLD.cash_period, 'caixa_nova', NEW.cash_period));
  ELSIF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.cash_flow_payable_logs(payable_id, actor_id, action, details)
    VALUES (NEW.id, auth.uid(), 'Situação financeira alterada', jsonb_build_object('situacao_anterior', OLD.status, 'situacao_nova', NEW.status));
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.log_cash_flow_payable_change() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.log_cash_flow_payable_change() TO service_role;