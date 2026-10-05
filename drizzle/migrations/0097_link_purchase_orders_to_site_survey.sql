ALTER TABLE public.purchase_orders
ADD COLUMN IF NOT EXISTS site_survey_visit_id UUID REFERENCES public.site_survey_visits(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS purchase_orders_site_survey_visit_id_idx
ON public.purchase_orders(site_survey_visit_id)
WHERE site_survey_visit_id IS NOT NULL;

COMMENT ON COLUMN public.purchase_orders.site_survey_visit_id IS 'Site Survey visit that originated the reviewed material request.';