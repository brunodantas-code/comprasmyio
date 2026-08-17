ALTER TABLE public.materials
  ADD COLUMN IF NOT EXISTS location text NOT NULL DEFAULT 'fabrica';

ALTER TABLE public.materials
  DROP CONSTRAINT IF EXISTS materials_location_check;
ALTER TABLE public.materials
  ADD CONSTRAINT materials_location_check CHECK (location IN ('almoxarifado','fabrica','escritorio'));

DROP VIEW IF EXISTS public.material_stock;
CREATE VIEW public.material_stock AS
SELECT m.id AS material_id,
    m.name,
    m.link,
    m.location,
    COALESCE(sum(CASE WHEN s.type = 'saida'::stock_movement_type THEN - s.quantity ELSE s.quantity END), 0::bigint)::integer AS balance,
    COALESCE(sum(CASE WHEN s.type = 'saida'::stock_movement_type THEN 0 ELSE s.quantity END), 0::bigint)::integer AS total_in,
    COALESCE(sum(CASE WHEN s.type = 'saida'::stock_movement_type THEN s.quantity ELSE 0 END), 0::bigint)::integer AS total_out,
    max(s.created_at) AS last_movement_at
   FROM public.materials m
     LEFT JOIN public.stock_movements s ON s.material_id = m.id
  GROUP BY m.id, m.name, m.link, m.location;

GRANT SELECT ON public.material_stock TO authenticated;
GRANT ALL ON public.material_stock TO service_role;

INSERT INTO public.materials (name, location)
SELECT v.name, 'almoxarifado'
FROM (VALUES
  ('Myio Switch normal'),
  ('Myio Switch normal c/ temp.'),
  ('Myio Switch 24v'),
  ('Myio Switch Hidrômetro'),
  ('Myio Sw 4-20ma Nível'),
  ('Myio Sw Reboot'),
  ('Myio 3F TC 50A'),
  ('Myio 3F TC 100A'),
  ('Myio 3F TC 400A'),
  ('Myio 3F TC 1000A'),
  ('Myio 3F TC 2000A'),
  ('Myio Central'),
  ('Myio Remote'),
  ('Hidrômetro Unijato DN20 (3/4)'),
  ('Hidrômetro Multijato DN25 (1")'),
  ('Hidrômetro Multijato DN40 (1" 1/4)'),
  ('Hidrômetro Flange Multijato DN50'),
  ('Hidrômetro Flange Woltman DN80'),
  ('Hidrômetro Flange Woltman DN100'),
  ('Sensor 3D Plano Parafuso Akvometer'),
  ('Sensor 3D Vertical Hidrômetro'),
  ('Sensor Sirius ACB Mensolarb')
) AS v(name)
WHERE NOT EXISTS (
  SELECT 1 FROM public.materials m WHERE m.name = v.name AND m.location = 'almoxarifado'
);