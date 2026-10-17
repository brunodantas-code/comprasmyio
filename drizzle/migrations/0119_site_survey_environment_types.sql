CREATE TABLE public.site_survey_environment_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  normalized_name text NOT NULL UNIQUE,
  discipline text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_survey_environment_types TO authenticated;
GRANT ALL ON public.site_survey_environment_types TO service_role;

ALTER TABLE public.site_survey_environment_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Site Survey users can view environment types"
ON public.site_survey_environment_types FOR SELECT TO authenticated
USING (public.has_site_survey_permission(auth.uid(), 'site_survey_agendar') OR public.has_site_survey_permission(auth.uid(), 'site_survey_editar') OR public.has_site_survey_permission(auth.uid(), 'site_survey_executar') OR public.has_site_survey_permission(auth.uid(), 'site_survey_cadastro') OR public.has_site_survey_permission(auth.uid(), 'site_survey_configuracoes'));

CREATE POLICY "Site Survey catalog managers can insert environment types"
ON public.site_survey_environment_types FOR INSERT TO authenticated
WITH CHECK ((public.has_site_survey_permission(auth.uid(), 'site_survey_cadastro') OR public.has_site_survey_permission(auth.uid(), 'site_survey_configuracoes')) AND (created_by = auth.uid()));

CREATE POLICY "Site Survey catalog managers can update environment types"
ON public.site_survey_environment_types FOR UPDATE TO authenticated
USING (public.has_site_survey_permission(auth.uid(), 'site_survey_cadastro') OR public.has_site_survey_permission(auth.uid(), 'site_survey_configuracoes'))
WITH CHECK (public.has_site_survey_permission(auth.uid(), 'site_survey_cadastro') OR public.has_site_survey_permission(auth.uid(), 'site_survey_configuracoes'));

CREATE POLICY "Site Survey catalog managers can delete environment types"
ON public.site_survey_environment_types FOR DELETE TO authenticated
USING (public.has_site_survey_permission(auth.uid(), 'site_survey_cadastro') OR public.has_site_survey_permission(auth.uid(), 'site_survey_configuracoes'));

ALTER TABLE public.site_survey_visit_environments ADD COLUMN environment_type_id uuid REFERENCES public.site_survey_environment_types(id);