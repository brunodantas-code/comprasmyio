ALTER TABLE public.site_survey_visit_lucs
ADD COLUMN location text;

COMMENT ON COLUMN public.site_survey_visit_lucs.location IS 'Localização opcional da loja dentro do shopping, como piso, andar ou ala.';