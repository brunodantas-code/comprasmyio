ALTER TABLE public.site_survey_custom_catalog_items ADD COLUMN quantity numeric NOT NULL DEFAULT 1, ADD COLUMN unit text NOT NULL DEFAULT 'un';
ALTER TABLE public.site_survey_custom_catalog_items ADD CONSTRAINT survey_catalog_item_positive_quantity CHECK (quantity > 0);
ALTER TABLE public.site_survey_custom_catalog_items ADD CONSTRAINT survey_catalog_item_unit CHECK (unit IN ('un', 'm'));
ALTER TABLE public.site_survey_custom_catalogs ADD COLUMN purpose text;
CREATE UNIQUE INDEX survey_custom_catalog_purpose_unique ON public.site_survey_custom_catalogs (purpose) WHERE purpose IS NOT NULL;
COMMENT ON COLUMN public.site_survey_custom_catalogs.purpose IS 'Stable integration key independent of editable catalog name';