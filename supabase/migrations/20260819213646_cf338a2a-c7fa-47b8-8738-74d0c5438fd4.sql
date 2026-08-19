CREATE TABLE public.unit_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id uuid NOT NULL REFERENCES public.materials(id) ON DELETE CASCADE,
  label text,
  status text NOT NULL DEFAULT 'parado',
  installed_at timestamptz,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unit_products_status_check CHECK (status IN ('parado','instalado'))
);

CREATE UNIQUE INDEX unit_products_label_unique ON public.unit_products (label) WHERE label IS NOT NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.unit_products TO authenticated;
GRANT ALL ON public.unit_products TO service_role;

ALTER TABLE public.unit_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view unit products" ON public.unit_products FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert unit products" ON public.unit_products FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update unit products" ON public.unit_products FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admins can delete unit products" ON public.unit_products FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER unit_products_set_updated_at BEFORE UPDATE ON public.unit_products FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();