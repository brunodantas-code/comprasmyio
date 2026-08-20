CREATE TABLE public.myio_shipments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.myio_orders(id) ON DELETE CASCADE,
  address text NOT NULL,
  shipping_method text NOT NULL,
  responsible text NOT NULL,
  tracking_code text NOT NULL,
  proof_url text NOT NULL,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.myio_shipments TO authenticated;
GRANT ALL ON public.myio_shipments TO service_role;
ALTER TABLE public.myio_shipments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view shipments" ON public.myio_shipments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can create shipments" ON public.myio_shipments FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Admins can delete shipments" ON public.myio_shipments FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));