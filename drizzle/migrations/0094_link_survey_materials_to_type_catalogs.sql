ALTER TABLE public.site_survey_material_catalog ADD COLUMN type_catalog_id uuid REFERENCES public.site_survey_custom_catalogs(id) ON DELETE SET NULL;
ALTER TABLE public.site_survey_material_catalog ADD COLUMN type_builtin text CHECK (type_builtin IN ('screwdriver', 'wrench'));
ALTER TABLE public.site_survey_material_catalog ADD CONSTRAINT site_survey_material_one_type_source CHECK (type_catalog_id IS NULL OR type_builtin IS NULL);
ALTER TABLE public.site_survey_visit_materials ADD COLUMN custom_type_item_id uuid REFERENCES public.site_survey_custom_catalog_items(id) ON DELETE RESTRICT;
UPDATE public.site_survey_material_catalog SET type_builtin = 'screwdriver' WHERE name = 'Chave de fenda';
UPDATE public.site_survey_material_catalog SET type_builtin = 'wrench' WHERE name = 'Chave de grifo';
UPDATE public.site_survey_material_catalog SET type_catalog_id = (SELECT id FROM public.site_survey_custom_catalogs WHERE name = 'Bitolas de chaves de boca' AND active = true ORDER BY created_at LIMIT 1) WHERE name = 'Chaves de boca';