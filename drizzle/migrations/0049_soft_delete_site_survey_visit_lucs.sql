ALTER TABLE public.site_survey_visit_lucs ADD COLUMN active boolean NOT NULL DEFAULT true;
CREATE INDEX site_survey_visit_lucs_active_idx ON public.site_survey_visit_lucs (visit_id, active, luc_number);
COMMENT ON COLUMN public.site_survey_visit_lucs.active IS 'Oculta o ambiente da OS sem apagar seu histórico.';