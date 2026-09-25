ALTER TABLE public.site_survey_visit_environments
  ADD COLUMN template_id uuid NULL REFERENCES public.site_survey_templates(id) ON DELETE RESTRICT;

CREATE INDEX site_survey_visit_environments_template_id_idx
  ON public.site_survey_visit_environments(template_id);

COMMENT ON COLUMN public.site_survey_visit_environments.template_id IS
  'Checklist específico do ambiente; quando nulo, usa o checklist padrão da visita.';