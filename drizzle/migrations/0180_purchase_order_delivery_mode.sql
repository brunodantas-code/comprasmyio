ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS delivery_mode text NOT NULL DEFAULT 'entrega';
ALTER TABLE public.purchase_orders DROP CONSTRAINT IF EXISTS purchase_orders_delivery_mode_check;
ALTER TABLE public.purchase_orders ADD CONSTRAINT purchase_orders_delivery_mode_check CHECK (delivery_mode IN ('entrega','retirada'));

CREATE OR REPLACE FUNCTION public.log_order_change()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.order_logs (order_id, actor_id, action, details)
    VALUES (NEW.id, NEW.requester_id, 'criado', jsonb_build_object('status', NEW.status, 'item', NEW.item_name));
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      INSERT INTO public.order_logs (order_id, actor_id, action, details)
      VALUES (NEW.id, auth.uid(), 'status_alterado', jsonb_build_object('de', OLD.status, 'para', NEW.status));
    END IF;
    IF NEW.buyer_notes IS DISTINCT FROM OLD.buyer_notes THEN
      INSERT INTO public.order_logs (order_id, actor_id, action, details)
      VALUES (NEW.id, auth.uid(), 'observacao_atualizada', jsonb_build_object('observacao', NEW.buyer_notes));
    END IF;
    IF NEW.delivery_mode IS DISTINCT FROM OLD.delivery_mode OR NEW.delivery_point IS DISTINCT FROM OLD.delivery_point THEN
      INSERT INTO public.order_logs (order_id, actor_id, action, details)
      VALUES (NEW.id, auth.uid(), 'modalidade_alterada', jsonb_build_object(
        'modalidade_de', OLD.delivery_mode, 'modalidade_para', NEW.delivery_mode,
        'endereco_de', OLD.delivery_point, 'endereco_para', NEW.delivery_point));
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;