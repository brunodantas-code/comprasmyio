ALTER TABLE public.projects
  DROP CONSTRAINT projects_client_id_fkey,
  ADD CONSTRAINT projects_client_id_fkey
    FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE RESTRICT;

ALTER TABLE public.purchase_orders
  DROP CONSTRAINT purchase_orders_client_id_fkey,
  ADD CONSTRAINT purchase_orders_client_id_fkey
    FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE RESTRICT;

ALTER TABLE public.myio_orders
  DROP CONSTRAINT myio_orders_client_id_fkey,
  ADD CONSTRAINT myio_orders_client_id_fkey
    FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE RESTRICT;

CREATE OR REPLACE FUNCTION public.get_client_deletion_links(_client_id uuid)
RETURNS TABLE(record_key text, record_type text, record_label text, record_detail text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Apenas administradores podem consultar vínculos de clientes';
  END IF;

  RETURN QUERY
  SELECT 'project:' || p.id::text, 'project', 'Projeto', p.name
  FROM public.projects p
  WHERE p.client_id = _client_id

  UNION ALL

  SELECT 'purchase_order:' || po.id::text, 'purchase_order',
         COALESCE(po.approval_number, 'Solicitação sem número'), po.item_name
  FROM public.purchase_orders po
  WHERE po.client_id = _client_id

  UNION ALL

  SELECT 'myio_order:' || mo.id::text, 'myio_order',
         COALESCE(po.approval_number, 'Solicitação de dispositivos myio'), mo.title
  FROM public.myio_orders mo
  LEFT JOIN public.purchase_orders po ON po.id = mo.purchase_order_id
  WHERE mo.client_id = _client_id
    AND (mo.purchase_order_id IS NULL OR po.client_id IS DISTINCT FROM _client_id)

  UNION ALL

  SELECT 'cash_flow_payable:' || cp.id::text, 'cash_flow_payable',
         COALESCE(cp.approval_number, 'Conta a pagar'), cp.item_name
  FROM public.cash_flow_payables cp
  LEFT JOIN public.purchase_orders po ON po.id = cp.source_order_id
  WHERE cp.client_id = _client_id
    AND (cp.source_order_id IS NULL OR po.client_id IS DISTINCT FROM _client_id)

  ORDER BY 2, 3, 4;
END;
$$;

CREATE OR REPLACE FUNCTION public.reallocate_client_link(
  _record_key text,
  _source_client_id uuid,
  _destination_client_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _record_type text := split_part(_record_key, ':', 1);
  _record_id uuid;
  _destination_name text;
  _destination_cnpj text;
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
    WHEN 'purchase_order' THEN
      UPDATE public.purchase_orders
      SET client_id = _destination_client_id
      WHERE id = _record_id AND client_id = _source_client_id;

      UPDATE public.myio_orders
      SET client_id = _destination_client_id,
          client_name = _destination_name
      WHERE purchase_order_id = _record_id AND client_id = _source_client_id;

      UPDATE public.cash_flow_payables
      SET client_id = _destination_client_id
      WHERE source_order_id = _record_id AND client_id = _source_client_id;
    WHEN 'myio_order' THEN
      UPDATE public.myio_orders
      SET client_id = _destination_client_id,
          client_name = _destination_name
      WHERE id = _record_id AND client_id = _source_client_id;
    WHEN 'cash_flow_payable' THEN
      UPDATE public.cash_flow_payables
      SET client_id = _destination_client_id
      WHERE id = _record_id AND client_id = _source_client_id;
    ELSE
      RAISE EXCEPTION 'Tipo de vínculo inválido';
  END CASE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Vínculo não encontrado ou já realocado';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.get_client_deletion_links(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_client_deletion_links(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_client_deletion_links(uuid) TO service_role;
REVOKE ALL ON FUNCTION public.reallocate_client_link(text, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reallocate_client_link(text, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reallocate_client_link(text, uuid, uuid) TO service_role;