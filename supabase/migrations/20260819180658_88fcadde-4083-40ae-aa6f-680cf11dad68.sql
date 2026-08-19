CREATE TABLE IF NOT EXISTS public.product_boms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_material_id uuid NOT NULL REFERENCES public.materials(id) ON DELETE CASCADE,
  component_material_id uuid NOT NULL REFERENCES public.materials(id) ON DELETE CASCADE,
  quantity numeric(12,3) NOT NULL CHECK (quantity > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_material_id, component_material_id)
);

GRANT SELECT ON public.product_boms TO authenticated;
GRANT ALL ON public.product_boms TO service_role;
ALTER TABLE public.product_boms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS product_boms_select_auth ON public.product_boms;
CREATE POLICY product_boms_select_auth ON public.product_boms FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS product_boms_admin_all ON public.product_boms;
CREATE POLICY product_boms_admin_all ON public.product_boms FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP VIEW IF EXISTS public.material_stock;
DROP POLICY IF EXISTS stock_insert_auth ON public.stock_movements;
ALTER TABLE public.stock_movements ALTER COLUMN quantity TYPE numeric(12,3);
CREATE POLICY stock_insert_auth ON public.stock_movements FOR INSERT TO authenticated
  WITH CHECK ((created_by = auth.uid()) AND (quantity > 0));

CREATE VIEW public.material_stock
WITH (security_invoker = true) AS
SELECT m.id AS material_id,
   m.name,
   m.link,
   m.location,
   COALESCE(sum(CASE WHEN s.type = 'saida'::stock_movement_type THEN -s.quantity ELSE s.quantity END), 0)::numeric(12,3) AS balance,
   COALESCE(sum(CASE WHEN s.type = 'saida'::stock_movement_type THEN 0 ELSE s.quantity END), 0)::numeric(12,3) AS total_in,
   COALESCE(sum(CASE WHEN s.type = 'saida'::stock_movement_type THEN s.quantity ELSE 0 END), 0)::numeric(12,3) AS total_out,
   max(s.created_at) AS last_movement_at
FROM materials m
LEFT JOIN stock_movements s ON s.material_id = m.id
GROUP BY m.id, m.name, m.link, m.location;

GRANT SELECT ON public.material_stock TO authenticated;