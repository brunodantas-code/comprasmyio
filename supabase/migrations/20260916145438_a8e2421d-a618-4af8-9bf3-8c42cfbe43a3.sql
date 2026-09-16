ALTER TABLE public.cash_flow_reconciliations
  DROP CONSTRAINT IF EXISTS cash_flow_reconciliations_payable_id_fkey;

ALTER TABLE public.cash_flow_reconciliations
  ADD CONSTRAINT cash_flow_reconciliations_payable_id_fkey
  FOREIGN KEY (payable_id)
  REFERENCES public.cash_flow_payables(id)
  ON DELETE CASCADE;

ALTER TABLE public.cash_flow_payables
  DROP CONSTRAINT IF EXISTS cash_flow_payables_source_order_id_fkey;

ALTER TABLE public.cash_flow_payables
  ADD CONSTRAINT cash_flow_payables_source_order_id_fkey
  FOREIGN KEY (source_order_id)
  REFERENCES public.purchase_orders(id)
  ON DELETE CASCADE;