CREATE TABLE public.homologations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  release_id uuid NOT NULL REFERENCES public.assembly_releases(id) ON DELETE CASCADE,
  material_id uuid NOT NULL REFERENCES public.materials(id),
  box_size integer NOT NULL CHECK (box_size IN (1,10,50,100,224)),
  box_qr text,
  responsible_id uuid REFERENCES auth.users(id),
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.homologations TO authenticated;
GRANT DELETE ON public.homologations TO authenticated;
GRANT ALL ON public.homologations TO service_role;
ALTER TABLE public.homologations ENABLE ROW LEVEL SECURITY;
CREATE POLICY homologations_select_auth ON public.homologations FOR SELECT TO authenticated USING (true);
CREATE POLICY homologations_insert_auth ON public.homologations FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY homologations_delete_admin ON public.homologations FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE public.homologation_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  homologation_id uuid NOT NULL REFERENCES public.homologations(id) ON DELETE CASCADE,
  position integer NOT NULL,
  qr_value text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.homologation_units TO authenticated;
GRANT DELETE ON public.homologation_units TO authenticated;
GRANT ALL ON public.homologation_units TO service_role;
ALTER TABLE public.homologation_units ENABLE ROW LEVEL SECURITY;
CREATE POLICY homologation_units_select_auth ON public.homologation_units FOR SELECT TO authenticated USING (true);
CREATE POLICY homologation_units_insert_auth ON public.homologation_units FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.homologations h WHERE h.id = homologation_id AND h.created_by = auth.uid()));
CREATE POLICY homologation_units_delete_admin ON public.homologation_units FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_homologations_release ON public.homologations(release_id);
CREATE INDEX idx_homologation_units_hom ON public.homologation_units(homologation_id);