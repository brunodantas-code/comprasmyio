ALTER TABLE public.site_survey_visit_lucs ADD COLUMN IF NOT EXISTS meter_number text;
ALTER TABLE public.site_survey_visit_environments ADD COLUMN IF NOT EXISTS meter_number text;
COMMENT ON COLUMN public.site_survey_visit_lucs.meter_number IS 'Número do medidor de energia e/ou água do ponto.';
COMMENT ON COLUMN public.site_survey_visit_environments.meter_number IS 'Número do medidor de energia e/ou água do ambiente.';