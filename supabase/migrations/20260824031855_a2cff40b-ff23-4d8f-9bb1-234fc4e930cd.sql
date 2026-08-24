ALTER TABLE public.materials DROP CONSTRAINT IF EXISTS materials_location_check;
ALTER TABLE public.materials
  ADD CONSTRAINT materials_location_check
  CHECK (location IN ('almoxarifado','fabrica','escritorio','almoxarifado_geral'));

CREATE TABLE public.damaged_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id uuid REFERENCES public.materials(id) ON DELETE SET NULL,
  product text NOT NULL,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  source text NOT NULL,
  source_detail text,
  reason text NOT NULL,
  photo_url text,
  status text NOT NULL DEFAULT 'avariado' CHECK (status IN ('avariado','recuperado')),
  recovered_to text,
  recovery_notes text,
  recovered_by uuid REFERENCES auth.users(id),
  recovered_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.damaged_items TO authenticated;
GRANT ALL ON public.damaged_items TO service_role;

ALTER TABLE public.damaged_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY damaged_items_select_auth ON public.damaged_items FOR SELECT TO authenticated USING (true);
CREATE POLICY damaged_items_insert_auth ON public.damaged_items FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY damaged_items_update_auth ON public.damaged_items FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY damaged_items_delete_admin ON public.damaged_items FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));