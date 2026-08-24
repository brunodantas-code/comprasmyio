CREATE OR REPLACE FUNCTION public.prevent_negative_stock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
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
    RAISE EXCEPTION 'Estoque insuficiente: saldo atual %, tentativa de saída de %', current_saldo, NEW.quantity;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_prevent_negative_stock
BEFORE INSERT ON public.stock_movements
FOR EACH ROW EXECUTE FUNCTION public.prevent_negative_stock();