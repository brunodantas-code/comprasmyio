ALTER TABLE public.myio_orders
ADD COLUMN client_unit_id UUID REFERENCES public.client_units(id) ON DELETE RESTRICT;

CREATE INDEX myio_orders_client_unit_id_idx
ON public.myio_orders(client_unit_id);

CREATE OR REPLACE FUNCTION public.validate_client_unit_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  unit_client_id UUID;
  unit_active BOOLEAN;
BEGIN
  IF NEW.client_unit_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.client_id IS NULL THEN
    RAISE EXCEPTION 'Selecione o cliente da filial ou unidade.' USING ERRCODE = '23514';
  END IF;

  SELECT client_id, active INTO unit_client_id, unit_active
  FROM public.client_units
  WHERE id = NEW.client_unit_id;

  IF unit_client_id IS NULL OR unit_client_id <> NEW.client_id THEN
    RAISE EXCEPTION 'A filial ou unidade não pertence ao cliente selecionado.' USING ERRCODE = '23514';
  END IF;

  IF NOT unit_active THEN
    RAISE EXCEPTION 'A filial ou unidade selecionada está inativa.' USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_purchase_order_client_unit
BEFORE INSERT OR UPDATE OF client_id, client_unit_id ON public.purchase_orders
FOR EACH ROW EXECUTE FUNCTION public.validate_client_unit_assignment();

CREATE TRIGGER validate_myio_order_client_unit
BEFORE INSERT OR UPDATE OF client_id, client_unit_id ON public.myio_orders
FOR EACH ROW EXECUTE FUNCTION public.validate_client_unit_assignment();