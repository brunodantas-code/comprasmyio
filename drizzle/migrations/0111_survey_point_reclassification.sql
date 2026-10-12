ALTER TABLE public.site_survey_visit_lucs ADD COLUMN classification_type text CHECK (classification_type IN ('shop','kiosk','environment'));
ALTER TABLE public.site_survey_visit_environments ADD COLUMN point_type text NOT NULL DEFAULT 'environment' CHECK (point_type IN ('shop','kiosk','environment'));
COMMENT ON COLUMN public.site_survey_visit_lucs.classification_type IS 'Classificação editável independente do armazenamento original; NULL preserva point_type legado e todos os vínculos.';
CREATE OR REPLACE FUNCTION public.clear_environment_facade_pending() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE effective_type text;
BEGIN
 IF TG_TABLE_NAME = 'site_survey_visit_lucs' THEN effective_type := COALESCE(NEW.classification_type, NEW.point_type); ELSE effective_type := NEW.point_type; END IF;
 IF effective_type = 'environment' THEN
  SELECT COALESCE(jsonb_agg(value), '[]'::jsonb) INTO NEW.pending_fields FROM jsonb_array_elements(COALESCE(NEW.pending_fields, '[]'::jsonb)) WHERE value <> '"Foto da fachada"'::jsonb;
 END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER clear_environment_facade_pending BEFORE INSERT OR UPDATE ON public.site_survey_visit_lucs FOR EACH ROW EXECUTE FUNCTION public.clear_environment_facade_pending();
CREATE TRIGGER clear_environment_facade_pending BEFORE INSERT OR UPDATE ON public.site_survey_visit_environments FOR EACH ROW EXECUTE FUNCTION public.clear_environment_facade_pending();
CREATE OR REPLACE FUNCTION public.sync_site_survey_shop_catalog() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE normalized text; effective_type text;
BEGIN
 effective_type := COALESCE(NEW.classification_type, NEW.point_type);
 IF effective_type NOT IN ('shop','kiosk') OR btrim(NEW.shop_name) = '' THEN RETURN NEW; END IF;
 normalized := public.normalize_site_survey_point_name(NEW.shop_name);
 INSERT INTO public.site_survey_shop_catalog (name, normalized_name, point_type, created_by, updated_by)
 VALUES (btrim(NEW.shop_name), normalized, effective_type, NEW.created_by, COALESCE(NEW.updated_by, NEW.created_by))
 ON CONFLICT (point_type, normalized_name) DO UPDATE SET active=true, updated_by=COALESCE(EXCLUDED.updated_by, public.site_survey_shop_catalog.updated_by), updated_at=now() WHERE NOT public.site_survey_shop_catalog.excluded_from_sync;
 RETURN NEW;
END;
$$;
CREATE OR REPLACE TRIGGER sync_site_survey_shop_catalog_classification AFTER UPDATE OF classification_type ON public.site_survey_visit_lucs FOR EACH ROW EXECUTE FUNCTION public.sync_site_survey_shop_catalog();