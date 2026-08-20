ALTER TABLE public.unit_products ALTER COLUMN material_id DROP NOT NULL;
ALTER TABLE public.unit_products ADD COLUMN IF NOT EXISTS product text;
ALTER TABLE public.unit_products ADD COLUMN IF NOT EXISTS order_id uuid REFERENCES public.myio_orders(id) ON DELETE SET NULL;