ALTER TABLE public.site_survey_visit_lucs ADD COLUMN contract_name text;
UPDATE public.site_survey_visit_lucs SET contract_name = shop_name WHERE contract_name IS NULL;
COMMENT ON COLUMN public.site_survey_visit_lucs.contract_name IS 'Nome do contrato junto ao shopping; copiado do nome da loja (fachada) na criação.';