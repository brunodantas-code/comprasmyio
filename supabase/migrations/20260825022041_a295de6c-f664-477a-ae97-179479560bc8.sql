ALTER TABLE public.purchase_orders
  ADD COLUMN terceiros_material_id uuid REFERENCES public.terceiros_materials(id);

ALTER TABLE public.terceiros_movements
  ADD COLUMN order_id uuid REFERENCES public.purchase_orders(id);

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
    END IF;
  END IF;
  RETURN NEW;
END;
$$;