CREATE OR REPLACE FUNCTION public.normalize_site_survey_point_name(_value text)
RETURNS text
LANGUAGE sql
IMMUTABLE
STRICT
SET search_path = public
AS $$
  SELECT regexp_replace(
    translate(
      lower(btrim(_value)),
      'áàâãäéèêëíìîïóòôõöúùûüçñ',
      'aaaaaeeeeiiiiooooouuuucn'
    ),
    '\s+',
    ' ',
    'g'
  )
$$;

CREATE TABLE public.site_survey_shop_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  normalized_name text NOT NULL,
  point_type text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_by uuid NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by uuid NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT site_survey_shop_catalog_name_not_blank CHECK (btrim(name) <> ''),
  CONSTRAINT site_survey_shop_catalog_point_type_check CHECK (point_type IN ('shop', 'kiosk')),
  CONSTRAINT site_survey_shop_catalog_normalized_matches CHECK (normalized_name = public.normalize_site_survey_point_name(name)),
  CONSTRAINT site_survey_shop_catalog_type_name_unique UNIQUE (point_type, normalized_name)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_survey_shop_catalog TO authenticated;
GRANT ALL ON public.site_survey_shop_catalog TO service_role;

ALTER TABLE public.site_survey_shop_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Site Survey users can view shop catalog"
ON public.site_survey_shop_catalog
FOR SELECT
TO authenticated
USING (
  public.has_site_survey_permission(auth.uid(), 'site_survey_agendar')
  OR public.has_site_survey_permission(auth.uid(), 'site_survey_editar')
  OR public.has_site_survey_permission(auth.uid(), 'site_survey_executar')
  OR public.has_site_survey_permission(auth.uid(), 'site_survey_cadastro')
  OR public.has_site_survey_permission(auth.uid(), 'site_survey_configuracoes')
);

CREATE POLICY "Site Survey catalog managers can insert shops"
ON public.site_survey_shop_catalog
FOR INSERT
TO authenticated
WITH CHECK (
  (public.has_site_survey_permission(auth.uid(), 'site_survey_cadastro')
    OR public.has_site_survey_permission(auth.uid(), 'site_survey_configuracoes'))
  AND created_by = auth.uid()
);

CREATE POLICY "Site Survey catalog managers can update shops"
ON public.site_survey_shop_catalog
FOR UPDATE
TO authenticated
USING (
  public.has_site_survey_permission(auth.uid(), 'site_survey_cadastro')
  OR public.has_site_survey_permission(auth.uid(), 'site_survey_configuracoes')
)
WITH CHECK (
  public.has_site_survey_permission(auth.uid(), 'site_survey_cadastro')
  OR public.has_site_survey_permission(auth.uid(), 'site_survey_configuracoes')
);

CREATE POLICY "Site Survey catalog managers can delete shops"
ON public.site_survey_shop_catalog
FOR DELETE
TO authenticated
USING (
  public.has_site_survey_permission(auth.uid(), 'site_survey_cadastro')
  OR public.has_site_survey_permission(auth.uid(), 'site_survey_configuracoes')
);

CREATE TRIGGER site_survey_shop_catalog_updated_at
BEFORE UPDATE ON public.site_survey_shop_catalog
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.sync_site_survey_shop_catalog()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  normalized text;
BEGIN
  IF NEW.point_type NOT IN ('shop', 'kiosk') OR btrim(NEW.shop_name) = '' THEN
    RETURN NEW;
  END IF;

  normalized := public.normalize_site_survey_point_name(NEW.shop_name);

  INSERT INTO public.site_survey_shop_catalog (
    name,
    normalized_name,
    point_type,
    created_by,
    updated_by
  ) VALUES (
    btrim(NEW.shop_name),
    normalized,
    NEW.point_type,
    NEW.created_by,
    COALESCE(NEW.updated_by, NEW.created_by)
  )
  ON CONFLICT (point_type, normalized_name)
  DO UPDATE SET
    active = true,
    updated_by = COALESCE(EXCLUDED.updated_by, public.site_survey_shop_catalog.updated_by),
    updated_at = now();

  RETURN NEW;
END;
$$;

CREATE TRIGGER sync_site_survey_shop_catalog_from_visits
AFTER INSERT OR UPDATE OF shop_name, point_type
ON public.site_survey_visit_lucs
FOR EACH ROW EXECUTE FUNCTION public.sync_site_survey_shop_catalog();

INSERT INTO public.site_survey_shop_catalog (
  name,
  normalized_name,
  point_type,
  created_by,
  updated_by,
  created_at,
  updated_at
)
SELECT DISTINCT ON (
  source.point_type,
  public.normalize_site_survey_point_name(source.shop_name)
)
  btrim(source.shop_name),
  public.normalize_site_survey_point_name(source.shop_name),
  source.point_type,
  source.created_by,
  source.updated_by,
  source.created_at,
  source.updated_at
FROM public.site_survey_visit_lucs AS source
WHERE source.point_type IN ('shop', 'kiosk')
  AND btrim(source.shop_name) <> ''
ORDER BY
  source.point_type,
  public.normalize_site_survey_point_name(source.shop_name),
  source.updated_at DESC,
  source.id DESC;

COMMENT ON TABLE public.site_survey_shop_catalog IS 'Catálogo reutilizável e deduplicado de nomes de lojas e quiosques usados no Site Survey.';
COMMENT ON COLUMN public.site_survey_shop_catalog.normalized_name IS 'Nome normalizado para evitar duplicidade por espaços, caixa ou acentuação.';