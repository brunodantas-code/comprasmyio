CREATE TABLE public.myio_delivery_qrs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  delivery_id uuid NOT NULL REFERENCES public.myio_item_deliveries(id) ON DELETE CASCADE,
  order_item_id uuid REFERENCES public.myio_order_items(id) ON DELETE CASCADE,
  qr_value text NOT NULL,
  box_qr text,
  homologation_unit_id uuid REFERENCES public.homologation_units(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.myio_delivery_qrs TO authenticated;
GRANT ALL ON public.myio_delivery_qrs TO service_role;

ALTER TABLE public.myio_delivery_qrs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "myio_delivery_qrs_select" ON public.myio_delivery_qrs FOR SELECT TO authenticated USING (true);
CREATE POLICY "myio_delivery_qrs_insert" ON public.myio_delivery_qrs FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "myio_delivery_qrs_delete" ON public.myio_delivery_qrs FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_myio_delivery_qrs_delivery ON public.myio_delivery_qrs(delivery_id);
CREATE INDEX idx_myio_delivery_qrs_item ON public.myio_delivery_qrs(order_item_id);