ALTER TABLE public.purchase_orders
  ADD COLUMN IF NOT EXISTS passphrase text,
  ADD COLUMN IF NOT EXISTS delivery_forecast date;