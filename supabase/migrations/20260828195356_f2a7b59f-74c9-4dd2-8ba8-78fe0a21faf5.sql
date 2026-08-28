CREATE OR REPLACE FUNCTION public.prevent_negative_stock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  current_saldo numeric;
BEGIN
  IF NEW.type <> 'saida' OR NEW.material_id IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT COALESCE(SUM(CASE WHEN type = 'saida' THEN -quantity ELSE quantity END), 0)
    INTO current_saldo
  FROM public.stock_movements
    WHERE material_id = NEW.material_id;
  IF current_saldo - NEW.quantity < 0 THEN
    RAISE EXCEPTION 'Estoque insuficiente para Retirada.';
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.prevent_negative_stock_terceiros()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
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
    RAISE EXCEPTION 'Estoque insuficiente para Retirada.';
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.prevent_negative_stock_tools()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
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
    RAISE EXCEPTION 'Estoque insuficiente para Retirada.';
  END IF;
  RETURN NEW;
END;
$function$;