CREATE OR REPLACE FUNCTION public.convert_client_to_unit(
  _source_client_id UUID,
  _destination_client_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  source_client public.clients%ROWTYPE;
  destination_client public.clients%ROWTYPE;
  converted_unit_id UUID;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_access_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Apenas administradores podem converter clientes em unidades.' USING ERRCODE = '42501';
  END IF;

  IF _source_client_id IS NULL OR _destination_client_id IS NULL OR _source_client_id = _destination_client_id THEN
    RAISE EXCEPTION 'Selecione outro cliente corporativo.' USING ERRCODE = '23514';
  END IF;

  SELECT * INTO source_client FROM public.clients WHERE id = _source_client_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cliente a converter não encontrado.' USING ERRCODE = '23503';
  END IF;

  SELECT * INTO destination_client FROM public.clients WHERE id = _destination_client_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cliente corporativo não encontrado.' USING ERRCODE = '23503';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.client_units
    WHERE client_id = _destination_client_id
      AND lower(btrim(name)) = lower(btrim(source_client.name))
  ) THEN
    RAISE EXCEPTION 'O cliente corporativo já possui uma unidade com este nome.' USING ERRCODE = '23505';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.client_units source_unit
    JOIN public.client_units destination_unit
      ON destination_unit.client_id = _destination_client_id
     AND lower(btrim(destination_unit.name)) = lower(btrim(source_unit.name))
    WHERE source_unit.client_id = _source_client_id
  ) THEN
    RAISE EXCEPTION 'Uma unidade do cliente convertido já existe no cliente corporativo.' USING ERRCODE = '23505';
  END IF;

  INSERT INTO public.client_units (client_id, name, cnpj, city, state, category_id, active, created_by)
  VALUES (_destination_client_id, source_client.name, source_client.cnpj, source_client.city, source_client.state, source_client.category_id, true, auth.uid())
  RETURNING id INTO converted_unit_id;

  UPDATE public.client_units
  SET client_id = _destination_client_id
  WHERE client_id = _source_client_id;

  UPDATE public.projects
  SET client_id = _destination_client_id,
      client_unit_id = COALESCE(client_unit_id, converted_unit_id),
      client_name = destination_client.name,
      client_cnpj = destination_client.cnpj
  WHERE client_id = _source_client_id;

  UPDATE public.purchase_orders
  SET client_id = _destination_client_id,
      client_unit_id = COALESCE(client_unit_id, converted_unit_id)
  WHERE client_id = _source_client_id;

  UPDATE public.myio_orders
  SET client_id = _destination_client_id,
      client_unit_id = COALESCE(client_unit_id, converted_unit_id),
      client_name = destination_client.name
  WHERE client_id = _source_client_id;

  UPDATE public.cash_flow_payables
  SET client_id = _destination_client_id,
      client_unit_id = COALESCE(client_unit_id, converted_unit_id)
  WHERE client_id = _source_client_id;

  DELETE FROM public.clients WHERE id = _source_client_id;

  RETURN converted_unit_id;
END;
$$;

REVOKE ALL ON FUNCTION public.convert_client_to_unit(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.convert_client_to_unit(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.convert_client_to_unit(UUID, UUID) TO service_role;