ALTER TABLE public.site_survey_visit_lucs
ADD COLUMN point_type TEXT NOT NULL DEFAULT 'shop'
CHECK (point_type IN ('shop', 'kiosk'));

COMMENT ON COLUMN public.site_survey_visit_lucs.point_type IS 'Classifica o ponto comercial como loja ou quiosque.';