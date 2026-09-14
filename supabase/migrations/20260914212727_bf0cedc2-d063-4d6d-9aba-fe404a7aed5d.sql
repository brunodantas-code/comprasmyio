CREATE OR REPLACE FUNCTION public.validate_cash_flow_entry_account()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE can_post boolean;
BEGIN
  IF NEW.account_id IS NULL THEN RETURN NEW; END IF;
  SELECT active AND accepts_entries AND NOT EXISTS (
    SELECT 1 FROM public.cash_flow_accounts child WHERE child.parent_id = NEW.account_id AND child.active
  ) INTO can_post
  FROM public.cash_flow_accounts WHERE id = NEW.account_id;
  IF COALESCE(can_post, false) = false THEN
    RAISE EXCEPTION 'Selecione uma conta final e ativa do Plano de Contas.';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER validate_cash_flow_payable_account BEFORE INSERT OR UPDATE OF account_id ON public.cash_flow_payables FOR EACH ROW EXECUTE FUNCTION public.validate_cash_flow_entry_account();
CREATE TRIGGER validate_cash_flow_transaction_account BEFORE INSERT OR UPDATE OF account_id ON public.cash_flow_transactions FOR EACH ROW EXECUTE FUNCTION public.validate_cash_flow_entry_account();

CREATE OR REPLACE FUNCTION public.validate_cash_flow_reconciliation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  transaction_value numeric;
  transaction_used numeric;
  payable_value numeric;
  payable_used numeric;
BEGIN
  SELECT abs(amount) INTO transaction_value FROM public.cash_flow_transactions WHERE id = NEW.transaction_id;
  SELECT amount INTO payable_value FROM public.cash_flow_payables WHERE id = NEW.payable_id;
  IF transaction_value IS NULL OR payable_value IS NULL THEN RAISE EXCEPTION 'Movimentação ou pagamento não encontrado.'; END IF;
  SELECT COALESCE(sum(matched_amount), 0) INTO transaction_used FROM public.cash_flow_reconciliations WHERE transaction_id = NEW.transaction_id AND id <> NEW.id;
  SELECT COALESCE(sum(matched_amount), 0) INTO payable_used FROM public.cash_flow_reconciliations WHERE payable_id = NEW.payable_id AND id <> NEW.id;
  IF transaction_used + NEW.matched_amount > transaction_value THEN RAISE EXCEPTION 'O valor conciliado supera o valor disponível da movimentação.'; END IF;
  IF payable_used + NEW.matched_amount > payable_value THEN RAISE EXCEPTION 'O valor conciliado supera o saldo pendente do pagamento.'; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER validate_cash_flow_reconciliation_trigger BEFORE INSERT OR UPDATE ON public.cash_flow_reconciliations FOR EACH ROW EXECUTE FUNCTION public.validate_cash_flow_reconciliation();

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
  ELSIF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.cash_flow_payable_logs(payable_id, actor_id, action, details)
    VALUES (NEW.id, auth.uid(), 'Situação financeira alterada', jsonb_build_object('situacao_anterior', OLD.status, 'situacao_nova', NEW.status));
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.log_cash_flow_payable_change() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.log_cash_flow_payable_change() TO service_role;
CREATE TRIGGER log_cash_flow_payable_change_trigger AFTER INSERT OR UPDATE ON public.cash_flow_payables FOR EACH ROW EXECUTE FUNCTION public.log_cash_flow_payable_change();