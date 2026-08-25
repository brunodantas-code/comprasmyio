CREATE TABLE public.tool_assets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  link text,
  photo_url text,
  lot_quantity integer,
  purchase_type text,
  description text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tool_assets_unique_name UNIQUE (name)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tool_assets TO authenticated;
GRANT ALL ON public.tool_assets TO service_role;
ALTER TABLE public.tool_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view tool assets" ON public.tool_assets FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert tool assets" ON public.tool_assets FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update tool assets" ON public.tool_assets FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete tool assets" ON public.tool_assets FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER tool_assets_set_updated_at BEFORE UPDATE ON public.tool_assets FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.tool_movements (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  material_id uuid NOT NULL REFERENCES public.tool_assets(id) ON DELETE CASCADE,
  quantity numeric NOT NULL,
  type stock_movement_type NOT NULL,
  reason text,
  destination text,
  responsible text,
  photo_url text,
  order_id uuid REFERENCES public.purchase_orders(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tool_movements TO authenticated;
GRANT ALL ON public.tool_movements TO service_role;
ALTER TABLE public.tool_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tool_mov_select_auth" ON public.tool_movements FOR SELECT TO authenticated USING (true);
CREATE POLICY "tool_mov_insert_auth" ON public.tool_movements FOR INSERT TO authenticated WITH CHECK ((created_by = auth.uid()) AND (quantity > 0));
CREATE POLICY "tool_mov_delete_admin" ON public.tool_movements FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.prevent_negative_stock_tools()
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
  FROM public.tool_movements
  WHERE material_id = NEW.material_id;
  IF current_saldo - NEW.quantity < 0 THEN
    RAISE EXCEPTION 'Estoque insuficiente: saldo atual %, tentativa de saída de %', current_saldo, NEW.quantity;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_prevent_negative_stock_tools BEFORE INSERT ON public.tool_movements FOR EACH ROW EXECUTE FUNCTION public.prevent_negative_stock_tools();

CREATE VIEW public.tool_asset_stock
WITH (security_invoker = true)
AS
SELECT m.id AS material_id,
  m.name,
  m.link,
  COALESCE(sum(CASE WHEN s.type = 'saida'::stock_movement_type THEN - s.quantity ELSE s.quantity END), 0::numeric)::numeric(12,3) AS balance,
  COALESCE(sum(CASE WHEN s.type = 'saida'::stock_movement_type THEN 0::numeric ELSE s.quantity END), 0::numeric)::numeric(12,3) AS total_in,
  COALESCE(sum(CASE WHEN s.type = 'saida'::stock_movement_type THEN s.quantity ELSE 0::numeric END), 0::numeric)::numeric(12,3) AS total_out,
  max(s.created_at) AS last_movement_at
FROM public.tool_assets m
  LEFT JOIN public.tool_movements s ON s.material_id = m.id
GROUP BY m.id, m.name, m.link;

GRANT SELECT ON public.tool_asset_stock TO authenticated;
GRANT ALL ON public.tool_asset_stock TO service_role;

ALTER TABLE public.purchase_orders ADD COLUMN tool_asset_id uuid REFERENCES public.tool_assets(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.stock_entry_on_receipt()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'recebido_ok'::order_status
     AND OLD.status IS DISTINCT FROM NEW.status
  THEN
    IF NEW.material_id IS NOT NULL
       AND NOT EXISTS (
         SELECT 1 FROM public.stock_movements
         WHERE order_id = NEW.id AND type = 'entrada'
       )
    THEN
      INSERT INTO public.stock_movements (material_id, quantity, type, reason, order_id, created_by)
      VALUES (NEW.material_id, GREATEST(NEW.quantity, 1), 'entrada', 'Recebimento do pedido', NEW.id, auth.uid());
    ELSIF NEW.terceiros_material_id IS NOT NULL
       AND NOT EXISTS (
         SELECT 1 FROM public.terceiros_movements
         WHERE order_id = NEW.id AND type = 'entrada'
       )
    THEN
      INSERT INTO public.terceiros_movements (material_id, quantity, type, reason, order_id, created_by)
      VALUES (NEW.terceiros_material_id, GREATEST(NEW.quantity, 1), 'entrada', 'Recebimento do pedido', NEW.id, auth.uid());
    ELSIF NEW.tool_asset_id IS NOT NULL
       AND NOT EXISTS (
         SELECT 1 FROM public.tool_movements
         WHERE order_id = NEW.id AND type = 'entrada'
       )
    THEN
      INSERT INTO public.tool_movements (material_id, quantity, type, reason, order_id, created_by)
      VALUES (NEW.tool_asset_id, GREATEST(NEW.quantity, 1), 'entrada', 'Recebimento do pedido', NEW.id, auth.uid());
    END IF;
  END IF;
  RETURN NEW;
END;
$$;