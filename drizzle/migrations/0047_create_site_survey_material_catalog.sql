CREATE TABLE public.site_survey_material_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL CHECK (category IN ('material', 'equipamento')),
  active boolean NOT NULL DEFAULT true,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT site_survey_material_catalog_name_unique UNIQUE (name)
);
GRANT SELECT ON public.site_survey_material_catalog TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.site_survey_material_catalog TO authenticated;
GRANT ALL ON public.site_survey_material_catalog TO service_role;
ALTER TABLE public.site_survey_material_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Site Survey users can view material catalog" ON public.site_survey_material_catalog FOR SELECT TO authenticated USING (public.has_site_survey_permission(auth.uid(), 'site_survey_visitas_minhas') OR public.has_site_survey_permission(auth.uid(), 'site_survey_visitas_todas') OR public.has_site_survey_permission(auth.uid(), 'site_survey_configuracoes'));
CREATE POLICY "Site Survey configurators manage material catalog" ON public.site_survey_material_catalog FOR ALL TO authenticated USING (public.has_site_survey_permission(auth.uid(), 'site_survey_configuracoes')) WITH CHECK (public.has_site_survey_permission(auth.uid(), 'site_survey_configuracoes'));

CREATE TABLE public.site_survey_screwdriver_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  active boolean NOT NULL DEFAULT true,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_survey_screwdriver_types TO authenticated;
GRANT ALL ON public.site_survey_screwdriver_types TO service_role;
ALTER TABLE public.site_survey_screwdriver_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Site Survey users can view screwdriver types" ON public.site_survey_screwdriver_types FOR SELECT TO authenticated USING (public.has_site_survey_permission(auth.uid(), 'site_survey_visitas_minhas') OR public.has_site_survey_permission(auth.uid(), 'site_survey_visitas_todas') OR public.has_site_survey_permission(auth.uid(), 'site_survey_configuracoes'));
CREATE POLICY "Site Survey configurators manage screwdriver types" ON public.site_survey_screwdriver_types FOR ALL TO authenticated USING (public.has_site_survey_permission(auth.uid(), 'site_survey_configuracoes')) WITH CHECK (public.has_site_survey_permission(auth.uid(), 'site_survey_configuracoes'));

CREATE TABLE public.site_survey_wrench_sizes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  active boolean NOT NULL DEFAULT true,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_survey_wrench_sizes TO authenticated;
GRANT ALL ON public.site_survey_wrench_sizes TO service_role;
ALTER TABLE public.site_survey_wrench_sizes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Site Survey users can view wrench sizes" ON public.site_survey_wrench_sizes FOR SELECT TO authenticated USING (public.has_site_survey_permission(auth.uid(), 'site_survey_visitas_minhas') OR public.has_site_survey_permission(auth.uid(), 'site_survey_visitas_todas') OR public.has_site_survey_permission(auth.uid(), 'site_survey_configuracoes'));
CREATE POLICY "Site Survey configurators manage wrench sizes" ON public.site_survey_wrench_sizes FOR ALL TO authenticated USING (public.has_site_survey_permission(auth.uid(), 'site_survey_configuracoes')) WITH CHECK (public.has_site_survey_permission(auth.uid(), 'site_survey_configuracoes'));

CREATE TABLE public.site_survey_visit_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id uuid NOT NULL REFERENCES public.site_survey_visits(id) ON DELETE CASCADE,
  catalog_item_id uuid NOT NULL REFERENCES public.site_survey_material_catalog(id) ON DELETE RESTRICT,
  quantity numeric(10,2) NOT NULL DEFAULT 1 CHECK (quantity > 0),
  notes text,
  screwdriver_type_id uuid REFERENCES public.site_survey_screwdriver_types(id) ON DELETE RESTRICT,
  wrench_size_id uuid REFERENCES public.site_survey_wrench_sizes(id) ON DELETE RESTRICT,
  recorded_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT site_survey_visit_materials_unique UNIQUE NULLS NOT DISTINCT (visit_id, catalog_item_id, screwdriver_type_id, wrench_size_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_survey_visit_materials TO authenticated;
GRANT ALL ON public.site_survey_visit_materials TO service_role;
ALTER TABLE public.site_survey_visit_materials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view accessible visit materials" ON public.site_survey_visit_materials FOR SELECT TO authenticated USING (public.can_view_site_survey_visit(visit_id, auth.uid()));
CREATE POLICY "Executors can add visit materials" ON public.site_survey_visit_materials FOR INSERT TO authenticated WITH CHECK (public.can_view_site_survey_visit(visit_id, auth.uid()) AND public.has_site_survey_permission(auth.uid(), 'site_survey_executar') AND recorded_by = auth.uid());
CREATE POLICY "Executors can update visit materials" ON public.site_survey_visit_materials FOR UPDATE TO authenticated USING (public.can_view_site_survey_visit(visit_id, auth.uid()) AND public.has_site_survey_permission(auth.uid(), 'site_survey_executar')) WITH CHECK (public.can_view_site_survey_visit(visit_id, auth.uid()) AND public.has_site_survey_permission(auth.uid(), 'site_survey_executar'));
CREATE POLICY "Editors can delete visit materials" ON public.site_survey_visit_materials FOR DELETE TO authenticated USING (public.can_view_site_survey_visit(visit_id, auth.uid()) AND (public.has_site_survey_permission(auth.uid(), 'site_survey_executar') OR public.has_site_survey_permission(auth.uid(), 'site_survey_editar')));

CREATE INDEX site_survey_material_catalog_category_idx ON public.site_survey_material_catalog(category, active, position);
CREATE INDEX site_survey_visit_materials_visit_idx ON public.site_survey_visit_materials(visit_id);
CREATE TRIGGER set_site_survey_material_catalog_updated_at BEFORE UPDATE ON public.site_survey_material_catalog FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_site_survey_visit_materials_updated_at BEFORE UPDATE ON public.site_survey_visit_materials FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();