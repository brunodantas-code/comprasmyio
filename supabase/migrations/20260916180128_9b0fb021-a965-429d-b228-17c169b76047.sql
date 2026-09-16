CREATE TABLE public.material_stock_types (
  code text PRIMARY KEY,
  name text NOT NULL,
  destination_type text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT material_stock_types_code_not_blank CHECK (btrim(code) <> ''),
  CONSTRAINT material_stock_types_name_not_blank CHECK (btrim(name) <> ''),
  CONSTRAINT material_stock_types_name_length CHECK (char_length(btrim(name)) BETWEEN 2 AND 120),
  CONSTRAINT material_stock_types_destination_valid CHECK (destination_type IN ('fabrica', 'terceiros', 'almoxarifado', 'ferramentas')),
  CONSTRAINT material_stock_types_position_nonnegative CHECK (position >= 0)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.material_stock_types TO authenticated;
GRANT ALL ON public.material_stock_types TO service_role;

ALTER TABLE public.material_stock_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "material_stock_types_select"
ON public.material_stock_types
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "material_stock_types_manage"
ON public.material_stock_types
FOR ALL
TO authenticated
USING (public.can_manage_limits(auth.uid()))
WITH CHECK (public.can_manage_limits(auth.uid()));

CREATE UNIQUE INDEX material_stock_types_name_unique
ON public.material_stock_types (lower(btrim(name)));

CREATE TRIGGER material_stock_types_set_updated_at
BEFORE UPDATE ON public.material_stock_types
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.material_stock_types (code, name, destination_type, position, active, is_system) VALUES
  ('fabrica', 'Estoque Fábrica (Insumos de Fabricação)', 'fabrica', 1, true, true),
  ('terceiros', 'Estoque Myio (Insumos de Instalação)', 'terceiros', 2, true, true),
  ('almoxarifado', 'Estoque Almoxarifado', 'almoxarifado', 3, true, true),
  ('ferramentas', 'Ferramentas e Ativos', 'ferramentas', 4, true, true);

ALTER TABLE public.development_tickets
ADD COLUMN menu_name text,
ADD COLUMN submenu_name text,
ADD CONSTRAINT development_tickets_menu_name_length CHECK (menu_name IS NULL OR char_length(btrim(menu_name)) BETWEEN 1 AND 100),
ADD CONSTRAINT development_tickets_submenu_name_length CHECK (submenu_name IS NULL OR char_length(btrim(submenu_name)) BETWEEN 1 AND 100);