ALTER TABLE public.purchase_orders
ADD COLUMN allocation_type text;

ALTER TABLE public.purchase_orders
ADD CONSTRAINT purchase_orders_allocation_type_check
CHECK (allocation_type IS NULL OR allocation_type IN ('projeto', 'cliente', 'estoque', 'interna'));

COMMENT ON COLUMN public.purchase_orders.allocation_type IS 'Alocação explícita da solicitação: projeto, cliente, estoque ou interna.';