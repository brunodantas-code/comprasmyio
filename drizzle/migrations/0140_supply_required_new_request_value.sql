CREATE OR REPLACE FUNCTION public.validate_new_supply_request_value()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.request_model IN ('servicos', 'materiais', 'viagens')
     AND (NEW.estimated_value IS NULL OR NEW.estimated_value <= 0 OR NEW.estimated_value::text IN ('NaN', 'Infinity', '-Infinity') OR NEW.estimated_value > 1000000000) THEN
    RAISE EXCEPTION 'Informe o valor estimado maior que zero para Serviços, Materiais e Viagens.' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER c_validate_new_supply_request_value BEFORE INSERT ON public.purchase_orders FOR EACH ROW EXECUTE FUNCTION public.validate_new_supply_request_value();
CREATE OR REPLACE FUNCTION public.validate_new_supply_material_unit_value()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.purchase_orders WHERE id = NEW.order_id AND request_model = 'materiais')
     AND (NEW.estimated_unit_value IS NULL OR NEW.estimated_unit_value <= 0 OR NEW.estimated_unit_value::text IN ('NaN', 'Infinity', '-Infinity') OR NEW.estimated_unit_value > 1000000000) THEN
    RAISE EXCEPTION 'Informe o valor unitário estimado maior que zero para cada material.' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER validate_new_supply_material_unit_value BEFORE INSERT ON public.purchase_order_items FOR EACH ROW EXECUTE FUNCTION public.validate_new_supply_material_unit_value();