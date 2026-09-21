ALTER TABLE public.purchase_order_items
ADD COLUMN fulfillment_type text NOT NULL DEFAULT 'purchase';

ALTER TABLE public.purchase_order_items
ADD CONSTRAINT purchase_order_items_fulfillment_type_check
CHECK (fulfillment_type IN ('purchase', 'myio_device'));

COMMENT ON COLUMN public.purchase_order_items.fulfillment_type IS 'Defines whether the approved item is purchased or fulfilled from the myio device flow.';

CREATE OR REPLACE FUNCTION public.stock_entry_on_receipt()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  grouped_item record;
  has_grouped_items boolean;
BEGIN
  IF NEW.status = 'recebido_ok'::order_status
     AND OLD.status IS DISTINCT FROM NEW.status
  THEN
    SELECT EXISTS (
      SELECT 1 FROM public.purchase_order_items WHERE order_id = NEW.id
    ) INTO has_grouped_items;

    IF has_grouped_items THEN
      FOR grouped_item IN
        SELECT material_id, terceiros_material_id, tool_asset_id, quantity, item_name
        FROM public.purchase_order_items
        WHERE order_id = NEW.id
          AND fulfillment_type = 'purchase'
        ORDER BY position
      LOOP
        IF grouped_item.material_id IS NOT NULL
           AND NOT EXISTS (
             SELECT 1 FROM public.stock_movements
             WHERE order_id = NEW.id AND material_id = grouped_item.material_id AND type = 'entrada'
           )
        THEN
          INSERT INTO public.stock_movements (material_id, quantity, type, reason, order_id, created_by)
          VALUES (grouped_item.material_id, GREATEST(grouped_item.quantity, 1), 'entrada', 'Recebimento do pedido: ' || grouped_item.item_name, NEW.id, auth.uid());
        ELSIF grouped_item.terceiros_material_id IS NOT NULL
           AND NOT EXISTS (
             SELECT 1 FROM public.terceiros_movements
             WHERE order_id = NEW.id AND material_id = grouped_item.terceiros_material_id AND type = 'entrada'
           )
        THEN
          INSERT INTO public.terceiros_movements (material_id, quantity, type, reason, order_id, created_by)
          VALUES (grouped_item.terceiros_material_id, GREATEST(grouped_item.quantity, 1), 'entrada', 'Recebimento do pedido: ' || grouped_item.item_name, NEW.id, auth.uid());
        ELSIF grouped_item.tool_asset_id IS NOT NULL
           AND NOT EXISTS (
             SELECT 1 FROM public.tool_movements
             WHERE order_id = NEW.id AND material_id = grouped_item.tool_asset_id AND type = 'entrada'
           )
        THEN
          INSERT INTO public.tool_movements (material_id, quantity, type, reason, order_id, created_by)
          VALUES (grouped_item.tool_asset_id, GREATEST(grouped_item.quantity, 1), 'entrada', 'Recebimento do pedido: ' || grouped_item.item_name, NEW.id, auth.uid());
        END IF;
      END LOOP;
    ELSIF NEW.material_id IS NOT NULL
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
$function$;