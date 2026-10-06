CREATE OR REPLACE FUNCTION public.reopen_site_survey_visit_on_new_point()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.active THEN
    UPDATE public.site_survey_visits
       SET status = 'em_andamento', submitted_at = NULL
     WHERE id = NEW.visit_id AND status = 'em_revisao' AND NOT is_manual_entry;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS reopen_visit_on_new_luc ON public.site_survey_visit_lucs;
CREATE TRIGGER reopen_visit_on_new_luc AFTER INSERT ON public.site_survey_visit_lucs
FOR EACH ROW EXECUTE FUNCTION public.reopen_site_survey_visit_on_new_point();

DROP TRIGGER IF EXISTS reopen_visit_on_new_environment ON public.site_survey_visit_environments;
CREATE TRIGGER reopen_visit_on_new_environment AFTER INSERT ON public.site_survey_visit_environments
FOR EACH ROW EXECUTE FUNCTION public.reopen_site_survey_visit_on_new_point();

UPDATE public.site_survey_visits SET status = 'em_andamento', submitted_at = NULL
 WHERE id = 'e562bb6f-dd2e-488e-b6c3-609835196a25' AND status = 'em_revisao';