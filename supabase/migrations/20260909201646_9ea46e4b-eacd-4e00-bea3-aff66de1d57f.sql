ALTER TABLE public.purchase_orders
  ADD COLUMN IF NOT EXISTS request_type text NOT NULL DEFAULT 'materiais',
  ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS purchase_orders_client_id_idx ON public.purchase_orders(client_id);