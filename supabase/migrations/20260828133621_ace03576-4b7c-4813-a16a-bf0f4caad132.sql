ALTER TABLE public.materials ADD COLUMN IF NOT EXISTS manufacturer_code text, ADD COLUMN IF NOT EXISTS myio_code text;
ALTER TABLE public.terceiros_materials ADD COLUMN IF NOT EXISTS manufacturer_code text, ADD COLUMN IF NOT EXISTS myio_code text;
ALTER TABLE public.tool_assets ADD COLUMN IF NOT EXISTS manufacturer_code text, ADD COLUMN IF NOT EXISTS myio_code text;