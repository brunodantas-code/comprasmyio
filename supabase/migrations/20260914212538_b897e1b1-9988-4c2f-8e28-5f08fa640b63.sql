CREATE OR REPLACE FUNCTION public.can_manage_cash_flow(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, private
AS $$
  SELECT private.has_app_access(_user_id, 'cash_flow')
    AND (
      public.has_role(_user_id, 'admin')
      OR public.has_role(_user_id, 'financeiro')
      OR public.has_role(_user_id, 'cfo')
      OR private.is_erp_admin(_user_id)
    );
$$;
REVOKE ALL ON FUNCTION public.can_manage_cash_flow(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_manage_cash_flow(uuid) TO authenticated, service_role;

CREATE TABLE public.cash_flow_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  nature text NOT NULL CHECK (nature IN ('receita', 'despesa', 'ativo', 'passivo', 'resultado')),
  parent_id uuid REFERENCES public.cash_flow_accounts(id) ON DELETE RESTRICT,
  accepts_entries boolean NOT NULL DEFAULT true,
  active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cash_flow_accounts TO authenticated;
GRANT ALL ON public.cash_flow_accounts TO service_role;
ALTER TABLE public.cash_flow_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY cash_flow_accounts_select ON public.cash_flow_accounts FOR SELECT TO authenticated USING (public.can_manage_cash_flow(auth.uid()));
CREATE POLICY cash_flow_accounts_insert ON public.cash_flow_accounts FOR INSERT TO authenticated WITH CHECK (public.can_manage_cash_flow(auth.uid()));
CREATE POLICY cash_flow_accounts_update ON public.cash_flow_accounts FOR UPDATE TO authenticated USING (public.can_manage_cash_flow(auth.uid())) WITH CHECK (public.can_manage_cash_flow(auth.uid()));
CREATE POLICY cash_flow_accounts_delete ON public.cash_flow_accounts FOR DELETE TO authenticated USING (public.can_manage_cash_flow(auth.uid()));
CREATE UNIQUE INDEX cash_flow_accounts_sibling_name_unique ON public.cash_flow_accounts (COALESCE(parent_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(btrim(name)));
CREATE INDEX cash_flow_accounts_parent_idx ON public.cash_flow_accounts(parent_id);
CREATE TRIGGER cash_flow_accounts_updated_at BEFORE UPDATE ON public.cash_flow_accounts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.validate_cash_flow_account_parent()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE cursor_id uuid;
BEGIN
  IF NEW.parent_id IS NULL THEN RETURN NEW; END IF;
  IF NEW.parent_id = NEW.id THEN RAISE EXCEPTION 'Uma conta não pode ser superior a ela mesma.'; END IF;
  cursor_id := NEW.parent_id;
  WHILE cursor_id IS NOT NULL LOOP
    IF cursor_id = NEW.id THEN RAISE EXCEPTION 'A hierarquia do Plano de Contas não pode conter ciclos.'; END IF;
    SELECT parent_id INTO cursor_id FROM public.cash_flow_accounts WHERE id = cursor_id;
  END LOOP;
  RETURN NEW;
END;
$$;
CREATE TRIGGER validate_cash_flow_account_parent_trigger BEFORE INSERT OR UPDATE OF parent_id ON public.cash_flow_accounts FOR EACH ROW EXECUTE FUNCTION public.validate_cash_flow_account_parent();

CREATE TABLE public.cash_flow_budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.cash_flow_accounts(id) ON DELETE RESTRICT,
  fiscal_year integer NOT NULL CHECK (fiscal_year BETWEEN 2000 AND 2200),
  january numeric(15,2) NOT NULL DEFAULT 0 CHECK (january >= 0),
  february numeric(15,2) NOT NULL DEFAULT 0 CHECK (february >= 0),
  march numeric(15,2) NOT NULL DEFAULT 0 CHECK (march >= 0),
  april numeric(15,2) NOT NULL DEFAULT 0 CHECK (april >= 0),
  may numeric(15,2) NOT NULL DEFAULT 0 CHECK (may >= 0),
  june numeric(15,2) NOT NULL DEFAULT 0 CHECK (june >= 0),
  july numeric(15,2) NOT NULL DEFAULT 0 CHECK (july >= 0),
  august numeric(15,2) NOT NULL DEFAULT 0 CHECK (august >= 0),
  september numeric(15,2) NOT NULL DEFAULT 0 CHECK (september >= 0),
  october numeric(15,2) NOT NULL DEFAULT 0 CHECK (october >= 0),
  november numeric(15,2) NOT NULL DEFAULT 0 CHECK (november >= 0),
  december numeric(15,2) NOT NULL DEFAULT 0 CHECK (december >= 0),
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(account_id, fiscal_year)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cash_flow_budgets TO authenticated;
GRANT ALL ON public.cash_flow_budgets TO service_role;
ALTER TABLE public.cash_flow_budgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY cash_flow_budgets_select ON public.cash_flow_budgets FOR SELECT TO authenticated USING (public.can_manage_cash_flow(auth.uid()));
CREATE POLICY cash_flow_budgets_insert ON public.cash_flow_budgets FOR INSERT TO authenticated WITH CHECK (public.can_manage_cash_flow(auth.uid()));
CREATE POLICY cash_flow_budgets_update ON public.cash_flow_budgets FOR UPDATE TO authenticated USING (public.can_manage_cash_flow(auth.uid())) WITH CHECK (public.can_manage_cash_flow(auth.uid()));
CREATE POLICY cash_flow_budgets_delete ON public.cash_flow_budgets FOR DELETE TO authenticated USING (public.can_manage_cash_flow(auth.uid()));
CREATE TRIGGER cash_flow_budgets_updated_at BEFORE UPDATE ON public.cash_flow_budgets FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.cash_flow_payables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_order_id uuid NOT NULL UNIQUE REFERENCES public.purchase_orders(id) ON DELETE RESTRICT,
  approval_number text,
  request_type text NOT NULL,
  item_name text NOT NULL,
  requester_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  project_id uuid REFERENCES public.projects(id) ON DELETE RESTRICT,
  client_id uuid REFERENCES public.clients(id) ON DELETE RESTRICT,
  cost_center_id uuid REFERENCES public.cost_centers(id) ON DELETE RESTRICT,
  account_id uuid REFERENCES public.cash_flow_accounts(id) ON DELETE RESTRICT,
  amount numeric(15,2) NOT NULL CHECK (amount >= 0),
  due_date date,
  status text NOT NULL DEFAULT 'a_classificar' CHECK (status IN ('a_classificar', 'a_pagar', 'pago', 'parcialmente_conciliado', 'conciliado', 'cancelado')),
  classified_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  classified_at timestamptz,
  paid_at date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((status = 'a_classificar') OR account_id IS NOT NULL)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cash_flow_payables TO authenticated;
GRANT ALL ON public.cash_flow_payables TO service_role;
ALTER TABLE public.cash_flow_payables ENABLE ROW LEVEL SECURITY;
CREATE POLICY cash_flow_payables_select ON public.cash_flow_payables FOR SELECT TO authenticated USING (public.can_manage_cash_flow(auth.uid()));
CREATE POLICY cash_flow_payables_insert ON public.cash_flow_payables FOR INSERT TO authenticated WITH CHECK (public.can_manage_cash_flow(auth.uid()));
CREATE POLICY cash_flow_payables_update ON public.cash_flow_payables FOR UPDATE TO authenticated USING (public.can_manage_cash_flow(auth.uid())) WITH CHECK (public.can_manage_cash_flow(auth.uid()));
CREATE POLICY cash_flow_payables_delete ON public.cash_flow_payables FOR DELETE TO authenticated USING (public.can_manage_cash_flow(auth.uid()));
CREATE INDEX cash_flow_payables_status_idx ON public.cash_flow_payables(status, due_date);
CREATE TRIGGER cash_flow_payables_updated_at BEFORE UPDATE ON public.cash_flow_payables FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.cash_flow_payable_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payable_id uuid NOT NULL REFERENCES public.cash_flow_payables(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  action text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.cash_flow_payable_logs TO authenticated;
GRANT ALL ON public.cash_flow_payable_logs TO service_role;
ALTER TABLE public.cash_flow_payable_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY cash_flow_payable_logs_select ON public.cash_flow_payable_logs FOR SELECT TO authenticated USING (public.can_manage_cash_flow(auth.uid()));
CREATE POLICY cash_flow_payable_logs_insert ON public.cash_flow_payable_logs FOR INSERT TO authenticated WITH CHECK (public.can_manage_cash_flow(auth.uid()));

CREATE TABLE public.cash_flow_bank_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  bank_name text NOT NULL,
  agency text,
  account_number text,
  opening_balance numeric(15,2) NOT NULL DEFAULT 0,
  opening_balance_date date NOT NULL DEFAULT current_date,
  active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cash_flow_bank_accounts TO authenticated;
GRANT ALL ON public.cash_flow_bank_accounts TO service_role;
ALTER TABLE public.cash_flow_bank_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY cash_flow_bank_accounts_select ON public.cash_flow_bank_accounts FOR SELECT TO authenticated USING (public.can_manage_cash_flow(auth.uid()));
CREATE POLICY cash_flow_bank_accounts_insert ON public.cash_flow_bank_accounts FOR INSERT TO authenticated WITH CHECK (public.can_manage_cash_flow(auth.uid()));
CREATE POLICY cash_flow_bank_accounts_update ON public.cash_flow_bank_accounts FOR UPDATE TO authenticated USING (public.can_manage_cash_flow(auth.uid())) WITH CHECK (public.can_manage_cash_flow(auth.uid()));
CREATE POLICY cash_flow_bank_accounts_delete ON public.cash_flow_bank_accounts FOR DELETE TO authenticated USING (public.can_manage_cash_flow(auth.uid()));
CREATE UNIQUE INDEX cash_flow_bank_accounts_name_unique ON public.cash_flow_bank_accounts(lower(btrim(name)));
CREATE TRIGGER cash_flow_bank_accounts_updated_at BEFORE UPDATE ON public.cash_flow_bank_accounts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.cash_flow_statement_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_account_id uuid NOT NULL REFERENCES public.cash_flow_bank_accounts(id) ON DELETE RESTRICT,
  file_name text NOT NULL,
  file_format text NOT NULL CHECK (file_format IN ('ofx', 'csv')),
  file_hash text NOT NULL,
  row_count integer NOT NULL DEFAULT 0 CHECK (row_count >= 0),
  imported_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  imported_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(bank_account_id, file_hash)
);
GRANT SELECT, INSERT ON public.cash_flow_statement_imports TO authenticated;
GRANT ALL ON public.cash_flow_statement_imports TO service_role;
ALTER TABLE public.cash_flow_statement_imports ENABLE ROW LEVEL SECURITY;
CREATE POLICY cash_flow_statement_imports_select ON public.cash_flow_statement_imports FOR SELECT TO authenticated USING (public.can_manage_cash_flow(auth.uid()));
CREATE POLICY cash_flow_statement_imports_insert ON public.cash_flow_statement_imports FOR INSERT TO authenticated WITH CHECK (public.can_manage_cash_flow(auth.uid()));

CREATE TABLE public.cash_flow_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_account_id uuid NOT NULL REFERENCES public.cash_flow_bank_accounts(id) ON DELETE RESTRICT,
  import_id uuid REFERENCES public.cash_flow_statement_imports(id) ON DELETE RESTRICT,
  external_id text,
  posted_at date NOT NULL,
  amount numeric(15,2) NOT NULL CHECK (amount <> 0),
  description text NOT NULL,
  dedupe_key text NOT NULL,
  account_id uuid REFERENCES public.cash_flow_accounts(id) ON DELETE RESTRICT,
  reconciliation_status text NOT NULL DEFAULT 'pendente' CHECK (reconciliation_status IN ('pendente', 'parcial', 'conciliado', 'ignorado')),
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(bank_account_id, dedupe_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cash_flow_transactions TO authenticated;
GRANT ALL ON public.cash_flow_transactions TO service_role;
ALTER TABLE public.cash_flow_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY cash_flow_transactions_select ON public.cash_flow_transactions FOR SELECT TO authenticated USING (public.can_manage_cash_flow(auth.uid()));
CREATE POLICY cash_flow_transactions_insert ON public.cash_flow_transactions FOR INSERT TO authenticated WITH CHECK (public.can_manage_cash_flow(auth.uid()));
CREATE POLICY cash_flow_transactions_update ON public.cash_flow_transactions FOR UPDATE TO authenticated USING (public.can_manage_cash_flow(auth.uid())) WITH CHECK (public.can_manage_cash_flow(auth.uid()));
CREATE POLICY cash_flow_transactions_delete ON public.cash_flow_transactions FOR DELETE TO authenticated USING (public.can_manage_cash_flow(auth.uid()));
CREATE INDEX cash_flow_transactions_account_date_idx ON public.cash_flow_transactions(bank_account_id, posted_at DESC);

CREATE TABLE public.cash_flow_reconciliations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid NOT NULL REFERENCES public.cash_flow_transactions(id) ON DELETE RESTRICT,
  payable_id uuid NOT NULL REFERENCES public.cash_flow_payables(id) ON DELETE RESTRICT,
  matched_amount numeric(15,2) NOT NULL CHECK (matched_amount > 0),
  matched_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  matched_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(transaction_id, payable_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cash_flow_reconciliations TO authenticated;
GRANT ALL ON public.cash_flow_reconciliations TO service_role;
ALTER TABLE public.cash_flow_reconciliations ENABLE ROW LEVEL SECURITY;
CREATE POLICY cash_flow_reconciliations_select ON public.cash_flow_reconciliations FOR SELECT TO authenticated USING (public.can_manage_cash_flow(auth.uid()));
CREATE POLICY cash_flow_reconciliations_insert ON public.cash_flow_reconciliations FOR INSERT TO authenticated WITH CHECK (public.can_manage_cash_flow(auth.uid()));
CREATE POLICY cash_flow_reconciliations_update ON public.cash_flow_reconciliations FOR UPDATE TO authenticated USING (public.can_manage_cash_flow(auth.uid())) WITH CHECK (public.can_manage_cash_flow(auth.uid()));
CREATE POLICY cash_flow_reconciliations_delete ON public.cash_flow_reconciliations FOR DELETE TO authenticated USING (public.can_manage_cash_flow(auth.uid()));

CREATE OR REPLACE FUNCTION public.sync_approved_order_to_cash_flow()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.approval_status = 'aprovado' AND (TG_OP = 'INSERT' OR OLD.approval_status IS DISTINCT FROM 'aprovado') THEN
    INSERT INTO public.cash_flow_payables (
      source_order_id, approval_number, request_type, item_name, requester_id,
      project_id, client_id, cost_center_id, amount, due_date
    ) VALUES (
      NEW.id, NEW.approval_number, NEW.request_type, NEW.item_name, NEW.requester_id,
      NEW.project_id, NEW.client_id, NEW.cost_center_id, COALESCE(NEW.estimated_value, 0),
      COALESCE(NEW.payment_date, NEW.deadline_date)
    ) ON CONFLICT (source_order_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.sync_approved_order_to_cash_flow() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_approved_order_to_cash_flow() TO service_role;
CREATE TRIGGER sync_approved_order_to_cash_flow_trigger
AFTER INSERT OR UPDATE OF approval_status ON public.purchase_orders
FOR EACH ROW EXECUTE FUNCTION public.sync_approved_order_to_cash_flow();

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
BEGIN
  target_payable := COALESCE(NEW.payable_id, OLD.payable_id);
  target_transaction := COALESCE(NEW.transaction_id, OLD.transaction_id);

  SELECT amount INTO payable_total FROM public.cash_flow_payables WHERE id = target_payable;
  SELECT COALESCE(sum(matched_amount), 0) INTO payable_matched FROM public.cash_flow_reconciliations WHERE payable_id = target_payable;
  UPDATE public.cash_flow_payables SET status = CASE
    WHEN payable_matched <= 0 THEN CASE WHEN account_id IS NULL THEN 'a_classificar' ELSE 'a_pagar' END
    WHEN payable_matched < payable_total THEN 'parcialmente_conciliado'
    ELSE 'conciliado' END,
    paid_at = CASE WHEN payable_matched >= payable_total THEN COALESCE(paid_at, current_date) ELSE paid_at END
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
CREATE TRIGGER refresh_cash_flow_reconciliation_statuses_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.cash_flow_reconciliations
FOR EACH ROW EXECUTE FUNCTION public.refresh_cash_flow_reconciliation_statuses();