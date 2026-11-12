ALTER TABLE public.site_survey_visit_lucs ADD COLUMN IF NOT EXISTS facade_id_ok boolean;
ALTER TABLE public.site_survey_visit_environments ADD COLUMN IF NOT EXISTS facade_id_ok boolean;
COMMENT ON COLUMN public.site_survey_visit_lucs.facade_id_ok IS 'Identificação na foto da fachada confere com a lista do cliente (null = não avaliado).';