ALTER TABLE public.materials
  ADD CONSTRAINT materials_fabrica_not_manufactured
  CHECK (NOT (location = 'fabrica' AND is_manufactured));