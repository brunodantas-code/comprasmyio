ALTER TABLE public.external_product_states ADD COLUMN IF NOT EXISTS client_name text;

ALTER TABLE public.unit_products ADD COLUMN IF NOT EXISTS client_name text;