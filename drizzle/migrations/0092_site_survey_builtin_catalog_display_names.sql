CREATE TABLE public.site_survey_builtin_catalog_names (
  catalog_key text PRIMARY KEY CHECK (catalog_key IN ('catalog', 'screwdriver', 'wrench', 'actions', 'cancellation-reasons', 'pause-reasons')),
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 2 AND 120),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_survey_builtin_catalog_names TO authenticated;
GRANT ALL ON public.site_survey_builtin_catalog_names TO service_role;
ALTER TABLE public.site_survey_builtin_catalog_names ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Site Survey app users view builtin catalog names"
ON public.site_survey_builtin_catalog_names FOR SELECT TO authenticated
USING (
  public.has_site_survey_permission(auth.uid(), 'site_survey_visitas_minhas')
  OR public.has_site_survey_permission(auth.uid(), 'site_survey_visitas_todas')
  OR public.has_site_survey_permission(auth.uid(), 'site_survey_configuracoes')
  OR public.has_site_survey_permission(auth.uid(), 'site_survey_cadastro')
);
CREATE POLICY "Site Survey catalog managers edit builtin catalog names"
ON public.site_survey_builtin_catalog_names FOR ALL TO authenticated
USING (
  public.has_site_survey_permission(auth.uid(), 'site_survey_configuracoes')
  OR public.has_site_survey_permission(auth.uid(), 'site_survey_cadastro')
)
WITH CHECK (
  public.has_site_survey_permission(auth.uid(), 'site_survey_configuracoes')
  OR public.has_site_survey_permission(auth.uid(), 'site_survey_cadastro')
);
CREATE TRIGGER set_site_survey_builtin_catalog_names_updated_at
BEFORE UPDATE ON public.site_survey_builtin_catalog_names
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();