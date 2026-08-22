ALTER TABLE public.materials
  ADD CONSTRAINT materials_fabrica_only_components
  CHECK (NOT (location = 'fabrica' AND is_product = true));

CREATE UNIQUE INDEX IF NOT EXISTS materials_fabrica_unique_name
  ON public.materials (lower(btrim(name)))
  WHERE location = 'fabrica';