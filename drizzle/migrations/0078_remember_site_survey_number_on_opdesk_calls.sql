ALTER TABLE public.internal_calls ADD COLUMN site_survey_number bigint;
UPDATE public.internal_calls c SET site_survey_number = v.survey_number FROM public.site_survey_visits v WHERE c.site_survey_visit_id = v.id;
CREATE OR REPLACE FUNCTION public.remember_internal_call_survey_number()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.site_survey_visit_id IS NOT NULL THEN
    SELECT survey_number INTO NEW.site_survey_number FROM public.site_survey_visits WHERE id = NEW.site_survey_visit_id;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER remember_internal_call_survey_number BEFORE INSERT OR UPDATE OF site_survey_visit_id ON public.internal_calls FOR EACH ROW EXECUTE FUNCTION public.remember_internal_call_survey_number();