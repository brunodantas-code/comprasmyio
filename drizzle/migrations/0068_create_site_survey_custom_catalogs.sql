CREATE TABLE public.site_survey_custom_catalogs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 2 AND 120),
  position integer NOT NULL DEFAULT 0 CHECK (position >= 0),
  active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_survey_custom_catalogs TO authenticated;
GRANT ALL ON public.site_survey_custom_catalogs TO service_role;

ALTER TABLE public.site_survey_custom_catalogs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Site Survey custom catalogs are readable by app users"
ON public.site_survey_custom_catalogs
FOR SELECT TO authenticated
USING (
  public.has_site_survey_permission(auth.uid(), 'site_survey_visitas_minhas')
  OR public.has_site_survey_permission(auth.uid(), 'site_survey_visitas_todas')
  OR public.has_site_survey_permission(auth.uid(), 'site_survey_configuracoes')
  OR public.has_site_survey_permission(auth.uid(), 'site_survey_cadastro')
);

CREATE POLICY "Site Survey custom catalogs are managed by configurators"
ON public.site_survey_custom_catalogs
FOR ALL TO authenticated
USING (
  public.has_site_survey_permission(auth.uid(), 'site_survey_configuracoes')
  OR public.has_site_survey_permission(auth.uid(), 'site_survey_cadastro')
)
WITH CHECK (
  public.has_site_survey_permission(auth.uid(), 'site_survey_configuracoes')
  OR public.has_site_survey_permission(auth.uid(), 'site_survey_cadastro')
);

CREATE UNIQUE INDEX site_survey_custom_catalogs_name_unique
ON public.site_survey_custom_catalogs (lower(btrim(name)))
WHERE active;

CREATE INDEX site_survey_custom_catalogs_position_idx
ON public.site_survey_custom_catalogs (position, name);

CREATE TRIGGER set_site_survey_custom_catalogs_updated_at
BEFORE UPDATE ON public.site_survey_custom_catalogs
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.site_survey_custom_catalog_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  catalog_id uuid NOT NULL REFERENCES public.site_survey_custom_catalogs(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 120),
  position integer NOT NULL DEFAULT 0 CHECK (position >= 0),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_survey_custom_catalog_items TO authenticated;
GRANT ALL ON public.site_survey_custom_catalog_items TO service_role;

ALTER TABLE public.site_survey_custom_catalog_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Site Survey custom catalog items are readable by app users"
ON public.site_survey_custom_catalog_items
FOR SELECT TO authenticated
USING (
  public.has_site_survey_permission(auth.uid(), 'site_survey_visitas_minhas')
  OR public.has_site_survey_permission(auth.uid(), 'site_survey_visitas_todas')
  OR public.has_site_survey_permission(auth.uid(), 'site_survey_configuracoes')
  OR public.has_site_survey_permission(auth.uid(), 'site_survey_cadastro')
);

CREATE POLICY "Site Survey custom catalog items are managed by configurators"
ON public.site_survey_custom_catalog_items
FOR ALL TO authenticated
USING (
  public.has_site_survey_permission(auth.uid(), 'site_survey_configuracoes')
  OR public.has_site_survey_permission(auth.uid(), 'site_survey_cadastro')
)
WITH CHECK (
  public.has_site_survey_permission(auth.uid(), 'site_survey_configuracoes')
  OR public.has_site_survey_permission(auth.uid(), 'site_survey_cadastro')
);

CREATE UNIQUE INDEX site_survey_custom_catalog_items_name_unique
ON public.site_survey_custom_catalog_items (catalog_id, lower(btrim(name)))
WHERE active;

CREATE INDEX site_survey_custom_catalog_items_catalog_position_idx
ON public.site_survey_custom_catalog_items (catalog_id, position, name);

CREATE TRIGGER set_site_survey_custom_catalog_items_updated_at
BEFORE UPDATE ON public.site_survey_custom_catalog_items
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();