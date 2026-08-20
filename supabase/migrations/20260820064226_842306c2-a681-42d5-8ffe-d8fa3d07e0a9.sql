ALTER TABLE public.unit_products
  ADD COLUMN IF NOT EXISTS moved_to text,
  ADD COLUMN IF NOT EXISTS moved_technician text,
  ADD COLUMN IF NOT EXISTS move_photo_url text,
  ADD COLUMN IF NOT EXISTS moved_at timestamptz,
  ADD COLUMN IF NOT EXISTS move_notes text;