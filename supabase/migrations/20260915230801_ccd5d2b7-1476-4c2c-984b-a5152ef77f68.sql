CREATE OR REPLACE FUNCTION public.reallocate_client_link(
  _record_key text,
  _source_client_id uuid,
  _destination_client_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  _record_type text := split_part(_record_key, ':', 1);
  _record_id uuid;
  _destination_name text;
  _destination_cnpj text;
  _affected integer := 0;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Apenas administradores podem realocar vínculos de clientes';
  END IF;

  IF _source_client_id = _destination_client_id THEN
    RAISE EXCEPTION 'Selecione outro cliente';
  END IF;

  BEGIN
    _record_id := split_part(_record_key, ':', 2)::uuid;
  EXCEPTION WHEN invalid_text_representation THEN
    RAISE EXCEPTION 'Vínculo inválido';
  END;

  SELECT name, cnpj INTO _destination_name, _destination_cnpj
  FROM public.clients
  WHERE id = _destination_client_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cliente de destino não encontrado';
  END IF;

  CASE _record_type
    WHEN 'project' THEN
      UPDATE public.projects
      SET client_id = _destination_client_id,
          client_name = _destination_name,
          client_cnpj = _destination_cnpj
      WHERE id = _record_id AND client_id = _source_client_id;
      GET DIAGNOSTICS _affected = ROW_COUNT;
    WHEN 'purchase_order' THEN
      UPDATE public.purchase_orders
      SET client_id = _destination_client_id
      WHERE id = _record_id AND client_id = _source_client_id;
      GET DIAGNOSTICS _affected = ROW_COUNT;

      IF _affected > 0 THEN
        UPDATE public.myio_orders
        SET client_id = _destination_client_id,
            client_name = _destination_name
        WHERE purchase_order_id = _record_id AND client_id = _source_client_id;

        UPDATE public.cash_flow_payables
        SET client_id = _destination_client_id
        WHERE source_order_id = _record_id AND client_id = _source_client_id;
      END IF;
    WHEN 'myio_order' THEN
      UPDATE public.myio_orders
      SET client_id = _destination_client_id,
          client_name = _destination_name
      WHERE id = _record_id AND client_id = _source_client_id;
      GET DIAGNOSTICS _affected = ROW_COUNT;
    WHEN 'cash_flow_payable' THEN
      UPDATE public.cash_flow_payables
      SET client_id = _destination_client_id
      WHERE id = _record_id AND client_id = _source_client_id;
      GET DIAGNOSTICS _affected = ROW_COUNT;
    ELSE
      RAISE EXCEPTION 'Tipo de vínculo inválido';
  END CASE;

  IF _affected = 0 THEN
    RAISE EXCEPTION 'Vínculo não encontrado ou já realocado';
  END IF;
END;
$$;