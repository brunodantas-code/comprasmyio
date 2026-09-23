ALTER TABLE public.site_survey_visits
  ADD COLUMN shop_name text,
  ADD COLUMN luc_number text,
  ADD COLUMN environments jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.site_survey_visits
  ADD CONSTRAINT site_survey_visits_environments_array_check
  CHECK (jsonb_typeof(environments) = 'array');

COMMENT ON COLUMN public.site_survey_visits.shop_name IS 'Nome da loja ocupante para clientes da categoria Shoppings.';
COMMENT ON COLUMN public.site_survey_visits.luc_number IS 'Número do LUC para clientes da categoria Shoppings.';
COMMENT ON COLUMN public.site_survey_visits.environments IS 'Lista de ambientes da ordem de serviço para clientes fora da categoria Shoppings.';