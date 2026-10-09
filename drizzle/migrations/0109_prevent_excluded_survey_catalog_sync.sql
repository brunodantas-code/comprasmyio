ALTER TABLE public.site_survey_shop_catalog ADD COLUMN excluded_from_sync boolean NOT NULL DEFAULT false;
COMMENT ON COLUMN public.site_survey_shop_catalog.excluded_from_sync IS 'Exclusão persistente do catálogo: impede que pontos históricos reativem nomes removidos, sem alterar as visitas.';
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
  INSERT INTO public.site_survey_shop_catalog (name, normalized_name, point_type, created_by, updated_by)
  VALUES (btrim(NEW.shop_name), normalized, NEW.point_type, NEW.created_by, COALESCE(NEW.updated_by, NEW.created_by))
  ON CONFLICT (point_type, normalized_name)
  DO UPDATE SET active = true,
    updated_by = COALESCE(EXCLUDED.updated_by, public.site_survey_shop_catalog.updated_by),
    updated_at = now()
  WHERE NOT public.site_survey_shop_catalog.excluded_from_sync;
  RETURN NEW;
END;
$$;