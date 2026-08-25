CREATE TABLE public.terceiros_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  link text,
  photo_url text,
  lot_quantity integer,
  purchase_type text,
  description text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX terceiros_materials_unique_name ON public.terceiros_materials (lower(trim(name)));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.terceiros_materials TO authenticated;
GRANT ALL ON public.terceiros_materials TO service_role;

ALTER TABLE public.terceiros_materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view terceiros materials" ON public.terceiros_materials FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert terceiros materials" ON public.terceiros_materials FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update terceiros materials" ON public.terceiros_materials FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete terceiros materials" ON public.terceiros_materials FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER terceiros_materials_set_updated_at BEFORE UPDATE ON public.terceiros_materials FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.terceiros_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id uuid NOT NULL REFERENCES public.terceiros_materials(id) ON DELETE CASCADE,
  quantity numeric NOT NULL,
  type public.stock_movement_type NOT NULL,
  reason text,
  responsible text,
  photo_url text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, DELETE ON public.terceiros_movements TO authenticated;
GRANT ALL ON public.terceiros_movements TO service_role;

ALTER TABLE public.terceiros_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "terceiros_mov_select_auth" ON public.terceiros_movements FOR SELECT TO authenticated USING (true);
CREATE POLICY "terceiros_mov_insert_auth" ON public.terceiros_movements FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid() AND quantity > 0);
CREATE POLICY "terceiros_mov_delete_admin" ON public.terceiros_movements FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.prevent_negative_stock_terceiros()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_saldo numeric;
BEGIN
  IF NEW.type <> 'saida' THEN
    RETURN NEW;
  END IF;
  SELECT COALESCE(SUM(CASE WHEN type = 'saida' THEN -quantity ELSE quantity END), 0)
    INTO current_saldo
  FROM public.terceiros_movements
  WHERE material_id = NEW.material_id;
  IF current_saldo - NEW.quantity < 0 THEN
    RAISE EXCEPTION 'Estoque insuficiente: saldo atual %, tentativa de saída de %', current_saldo, NEW.quantity;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_prevent_negative_stock_terceiros BEFORE INSERT ON public.terceiros_movements FOR EACH ROW EXECUTE FUNCTION public.prevent_negative_stock_terceiros();

CREATE VIEW public.terceiros_material_stock AS
SELECT
  m.id AS material_id,
  m.name,
  m.link,
  COALESCE(sum(CASE WHEN s.type = 'saida'::stock_movement_type THEN - s.quantity ELSE s.quantity END), 0::numeric)::numeric(12,3) AS balance,
  COALESCE(sum(CASE WHEN s.type = 'saida'::stock_movement_type THEN 0::numeric ELSE s.quantity END), 0::numeric)::numeric(12,3) AS total_in,
  COALESCE(sum(CASE WHEN s.type = 'saida'::stock_movement_type THEN s.quantity ELSE 0::numeric END), 0::numeric)::numeric(12,3) AS total_out,
  max(s.created_at) AS last_movement_at
FROM public.terceiros_materials m
LEFT JOIN public.terceiros_movements s ON s.material_id = m.id
GROUP BY m.id, m.name, m.link;

GRANT SELECT ON public.terceiros_material_stock TO authenticated;
GRANT SELECT ON public.terceiros_material_stock TO service_role;

INSERT INTO public.terceiros_materials (id, name, link, photo_url, lot_quantity, purchase_type, description, created_by, created_at, updated_at)
SELECT id, name, link, photo_url, lot_quantity, purchase_type, description, created_by, created_at, updated_at
FROM public.materials
WHERE location = 'almoxarifado' AND is_manufactured = false;

INSERT INTO public.terceiros_movements (material_id, quantity, type, reason, responsible, photo_url, created_by, created_at)
SELECT s.material_id, s.quantity, s.type, s.reason, s.responsible, s.photo_url, s.created_by, s.created_at
FROM public.stock_movements s
JOIN public.materials m ON m.id = s.material_id
WHERE m.location = 'almoxarifado' AND m.is_manufactured = false;

DELETE FROM public.stock_movements s
USING public.materials m
WHERE s.material_id = m.id AND m.location = 'almoxarifado' AND m.is_manufactured = false;

DELETE FROM public.materials
WHERE location = 'almoxarifado' AND is_manufactured = false;