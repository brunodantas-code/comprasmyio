ALTER TABLE public.purchase_orders
  ADD COLUMN IF NOT EXISTS travel_type text,
  ADD COLUMN IF NOT EXISTS travel_destination text,
  ADD COLUMN IF NOT EXISTS travel_departure date,
  ADD COLUMN IF NOT EXISTS travel_return date;