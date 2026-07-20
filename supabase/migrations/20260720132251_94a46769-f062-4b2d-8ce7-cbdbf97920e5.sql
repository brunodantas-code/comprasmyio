
ALTER TABLE public.order_logs DROP CONSTRAINT IF EXISTS order_logs_order_id_fkey;
ALTER TABLE public.order_logs
  ADD CONSTRAINT order_logs_order_id_fkey
  FOREIGN KEY (order_id) REFERENCES public.purchase_orders(id) ON DELETE CASCADE;
