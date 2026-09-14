CREATE OR REPLACE FUNCTION public.can_manage_cash_flow(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
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
REVOKE ALL ON FUNCTION public.refresh_cash_flow_reconciliation_statuses() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_cash_flow_reconciliation_statuses() TO service_role;