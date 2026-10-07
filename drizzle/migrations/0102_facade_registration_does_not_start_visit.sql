CREATE OR REPLACE FUNCTION public.survey_facade_saved()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_id uuid;
BEGIN
 IF NEW.attachment_kind <> 'facade' THEN RETURN NEW; END IF;
 v_id := COALESCE(NEW.visit_luc_id, NEW.visit_environment_id);
 IF v_id IS NULL THEN RETURN NEW; END IF;
 PERFORM set_config('app.survey_facade_patch', v_id::text, true);
 IF NEW.visit_luc_id IS NOT NULL THEN
  UPDATE public.site_survey_visit_lucs SET pending_fields = COALESCE((SELECT jsonb_agg(value) FROM jsonb_array_elements(COALESCE(pending_fields, '[]'::jsonb)) WHERE value <> '"Foto da fachada"'::jsonb), '[]'::jsonb) WHERE id = v_id;
 ELSE
  UPDATE public.site_survey_visit_environments SET pending_fields = COALESCE((SELECT jsonb_agg(value) FROM jsonb_array_elements(COALESCE(pending_fields, '[]'::jsonb)) WHERE value <> '"Foto da fachada"'::jsonb), '[]'::jsonb) WHERE id = v_id;
 END IF;
 PERFORM set_config('app.survey_facade_patch', '', true);
 RETURN NEW;
END;
$function$;