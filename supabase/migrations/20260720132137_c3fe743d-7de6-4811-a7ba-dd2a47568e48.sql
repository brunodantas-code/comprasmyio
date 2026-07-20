
ALTER TABLE public.purchase_orders
  ADD COLUMN IF NOT EXISTS quantity INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS recipient TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS requester_notes TEXT;

ALTER TABLE public.purchase_orders ALTER COLUMN item_link DROP NOT NULL;

DROP POLICY IF EXISTS "Admins can delete orders" ON public.purchase_orders;
CREATE POLICY "Admins can delete orders" ON public.purchase_orders
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
