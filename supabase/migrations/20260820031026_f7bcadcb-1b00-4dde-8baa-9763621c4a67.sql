CREATE TABLE public.myio_item_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.myio_orders(id) ON DELETE CASCADE,
  order_item_id uuid NOT NULL REFERENCES public.myio_order_items(id) ON DELETE CASCADE,
  product text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  photo_url text NOT NULL,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.myio_item_deliveries TO authenticated;
GRANT ALL ON public.myio_item_deliveries TO service_role;
ALTER TABLE public.myio_item_deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read deliveries" ON public.myio_item_deliveries FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert deliveries" ON public.myio_item_deliveries FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "admin delete deliveries" ON public.myio_item_deliveries FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));