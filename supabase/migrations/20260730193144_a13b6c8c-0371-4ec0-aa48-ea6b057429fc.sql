ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS material_id uuid REFERENCES public.materials(id) ON DELETE SET NULL;

CREATE TYPE public.stock_movement_type AS ENUM ('entrada', 'saida', 'ajuste');

CREATE TABLE public.stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id uuid NOT NULL REFERENCES public.materials(id) ON DELETE CASCADE,
  quantity integer NOT NULL,
  type public.stock_movement_type NOT NULL,
  reason text,
  order_id uuid REFERENCES public.purchase_orders(id) ON DELETE SET NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_stock_movements_material ON public.stock_movements(material_id);

GRANT SELECT, INSERT ON public.stock_movements TO authenticated;
GRANT DELETE ON public.stock_movements TO authenticated;
GRANT ALL ON public.stock_movements TO service_role;

ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stock_select_auth" ON public.stock_movements
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "stock_insert_auth" ON public.stock_movements
  FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid() AND quantity > 0);

CREATE POLICY "stock_delete_admin" ON public.stock_movements
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE VIEW public.material_stock
WITH (security_invoker = true) AS
SELECT
  m.id AS material_id,
  m.name,
  m.link,
  COALESCE(SUM(CASE WHEN s.type = 'saida' THEN -s.quantity ELSE s.quantity END), 0)::integer AS balance,
  COALESCE(SUM(CASE WHEN s.type = 'saida' THEN 0 ELSE s.quantity END), 0)::integer AS total_in,
  COALESCE(SUM(CASE WHEN s.type = 'saida' THEN s.quantity ELSE 0 END), 0)::integer AS total_out,
  MAX(s.created_at) AS last_movement_at
FROM public.materials m
LEFT JOIN public.stock_movements s ON s.material_id = m.id
GROUP BY m.id, m.name, m.link;

GRANT SELECT ON public.material_stock TO authenticated;
GRANT SELECT ON public.material_stock TO service_role;

CREATE OR REPLACE FUNCTION public.stock_entry_on_receipt()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'recebido_ok'::order_status
     AND OLD.status IS DISTINCT FROM NEW.status
     AND NEW.material_id IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM public.stock_movements
       WHERE order_id = NEW.id AND type = 'entrada'
     )
  THEN
    INSERT INTO public.stock_movements (material_id, quantity, type, reason, order_id, created_by)
    VALUES (NEW.material_id, GREATEST(NEW.quantity, 1), 'entrada', 'Recebimento do pedido', NEW.id, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_stock_entry_on_receipt
AFTER UPDATE ON public.purchase_orders
FOR EACH ROW EXECUTE FUNCTION public.stock_entry_on_receipt();

CREATE TRIGGER trg_log_order_change
AFTER INSERT OR UPDATE ON public.purchase_orders
FOR EACH ROW EXECUTE FUNCTION public.log_order_change();
