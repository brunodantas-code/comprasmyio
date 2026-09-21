ALTER TABLE public.materials
ADD COLUMN stock_type_code text REFERENCES public.material_stock_types(code);

ALTER TABLE public.terceiros_materials
ADD COLUMN stock_type_code text REFERENCES public.material_stock_types(code);

ALTER TABLE public.tool_assets
ADD COLUMN stock_type_code text REFERENCES public.material_stock_types(code);

UPDATE public.materials
SET stock_type_code = CASE
  WHEN location = 'fabrica' THEN 'fabrica'
  WHEN location = 'almoxarifado' THEN 'almoxarifado'
  ELSE NULL
END
WHERE stock_type_code IS NULL;

UPDATE public.terceiros_materials
SET stock_type_code = 'terceiros'
WHERE stock_type_code IS NULL;

UPDATE public.tool_assets
SET stock_type_code = 'ferramentas'
WHERE stock_type_code IS NULL;

CREATE INDEX materials_stock_type_code_idx ON public.materials(stock_type_code);
CREATE INDEX terceiros_materials_stock_type_code_idx ON public.terceiros_materials(stock_type_code);
CREATE INDEX tool_assets_stock_type_code_idx ON public.tool_assets(stock_type_code);