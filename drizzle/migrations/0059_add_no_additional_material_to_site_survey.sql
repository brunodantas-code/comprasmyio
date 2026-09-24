ALTER TABLE public.site_survey_visit_materials
  ADD COLUMN IF NOT EXISTS no_additional_material boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.site_survey_visit_materials.no_additional_material IS 'Indica que nenhum material adicional é necessário para o LUC ou ambiente vistoriado.';