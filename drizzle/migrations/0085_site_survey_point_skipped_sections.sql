ALTER TABLE public.site_survey_visit_lucs ADD COLUMN skipped_section_ids jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.site_survey_visit_environments ADD COLUMN skipped_section_ids jsonb NOT NULL DEFAULT '[]'::jsonb;
COMMENT ON COLUMN public.site_survey_visit_lucs.skipped_section_ids IS 'IDs das etapas não realizadas nesta loja, excluídas das pendências sem apagar respostas anteriores.';
COMMENT ON COLUMN public.site_survey_visit_environments.skipped_section_ids IS 'IDs das etapas não realizadas neste ambiente, excluídas das pendências sem apagar respostas anteriores.';