ALTER TABLE public.materials
  ADD COLUMN IF NOT EXISTS photo_url text,
  ADD COLUMN IF NOT EXISTS lot_quantity integer,
  ADD COLUMN IF NOT EXISTS purchase_type text;

ALTER TABLE public.materials DROP CONSTRAINT IF EXISTS materials_purchase_type_check;
ALTER TABLE public.materials ADD CONSTRAINT materials_purchase_type_check
  CHECK (purchase_type IS NULL OR purchase_type IN ('nacional','importacao'));