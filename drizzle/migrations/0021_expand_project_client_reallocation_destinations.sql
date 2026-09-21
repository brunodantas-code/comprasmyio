CREATE OR REPLACE FUNCTION public.get_project_deletion_links(_project_id uuid)
RETURNS TABLE(record_key text, record_type text, record_label text, record_detail text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Apenas administradores podem consultar vínculos de projetos';
  END IF;

  RETURN QUERY
  SELECT 'purchase_order:' || po.id::text, 'Solicitação', COALESCE(po.approval_number, 'Solicitação sem número'), po.item_name
  FROM public.purchase_orders po
  WHERE po.project_id = _project_id

  UNION ALL

  SELECT 'myio_order:' || mo.id::text, 'Solicitação de dispositivos', COALESCE(po.approval_number, 'Solicitação de dispositivos myio'), mo.title
  FROM public.myio_orders mo
  LEFT JOIN public.purchase_orders po ON po.id = mo.purchase_order_id
  WHERE mo.project_id = _project_id
    AND (mo.purchase_order_id IS NULL OR po.project_id IS DISTINCT FROM _project_id)

  UNION ALL

  SELECT 'cash_flow_payable:' || cp.id::text, 'Conta a pagar', COALESCE(cp.approval_number, 'Conta a pagar'), cp.item_name
  FROM public.cash_flow_payables cp
  LEFT JOIN public.purchase_orders po ON po.id = cp.source_order_id
  WHERE cp.project_id = _project_id
    AND (cp.source_order_id IS NULL OR po.project_id IS DISTINCT FROM _project_id)

  UNION ALL

  SELECT 'unit_product:' || up.id::text, 'Dispositivo', COALESCE(up.label, up.product, 'Dispositivo sem identificação'), COALESCE(up.client_name, 'Vinculado ao projeto')
  FROM public.unit_products up
  WHERE up.project_id = _project_id

  UNION ALL

  SELECT 'technician_move:' || tm.id::text, 'Movimentação de técnico', tm.technician, COALESCE(tm.notes, 'Vinculada ao projeto')
  FROM public.technician_moves tm
  WHERE tm.project_id = _project_id

  ORDER BY 2, 3, 4;
END;
$$;

CREATE OR REPLACE FUNCTION public.reallocate_allocation_link(
  _record_key text,
  _source_type text,
  _source_id uuid,
  _destination_type text,
  _destination_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _record_type text := split_part(_record_key, ':', 1);
  _record_id uuid;
  _destination_project_id uuid;
  _destination_client_id uuid;
  _destination_unit_id uuid;
  _destination_client_name text;
  _destination_client_cnpj text;
  _affected integer := 0;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Apenas administradores podem realocar vínculos';
  END IF;
  IF _source_type NOT IN ('project', 'client') OR _destination_type NOT IN ('project', 'client', 'unit') THEN
    RAISE EXCEPTION 'Origem ou destino inválido';
  END IF;

  BEGIN
    _record_id := split_part(_record_key, ':', 2)::uuid;
  EXCEPTION WHEN invalid_text_representation THEN
    RAISE EXCEPTION 'Vínculo inválido';
  END;

  IF _destination_type = 'project' THEN
    SELECT p.id INTO _destination_project_id FROM public.projects p WHERE p.id = _destination_id;
    IF _destination_project_id IS NULL THEN RAISE EXCEPTION 'Projeto de destino não encontrado'; END IF;
    IF _source_type = 'project' AND _source_id = _destination_project_id THEN RAISE EXCEPTION 'Selecione outro projeto'; END IF;
  ELSIF _destination_type = 'client' THEN
    SELECT c.id, c.name, c.cnpj INTO _destination_client_id, _destination_client_name, _destination_client_cnpj
    FROM public.clients c WHERE c.id = _destination_id;
    IF _destination_client_id IS NULL THEN RAISE EXCEPTION 'Cliente de destino não encontrado'; END IF;
    IF _source_type = 'client' AND _source_id = _destination_client_id THEN RAISE EXCEPTION 'Selecione outro cliente'; END IF;
  ELSE
    SELECT cu.client_id, cu.id, c.name, c.cnpj
    INTO _destination_client_id, _destination_unit_id, _destination_client_name, _destination_client_cnpj
    FROM public.client_units cu JOIN public.clients c ON c.id = cu.client_id
    WHERE cu.id = _destination_id AND cu.active;
    IF _destination_unit_id IS NULL THEN RAISE EXCEPTION 'Unidade ou filial de destino não encontrada ou inativa'; END IF;
    IF _source_type = 'client' AND _source_id = _destination_client_id THEN RAISE EXCEPTION 'Selecione uma unidade de outro cliente'; END IF;
  END IF;

  IF _record_type = 'project' THEN
    IF _source_type <> 'client' OR _destination_type = 'project' THEN
      RAISE EXCEPTION 'Um projeto vinculado deve ser movido para outro cliente ou unidade';
    END IF;
    UPDATE public.projects
    SET client_id = _destination_client_id,
        client_unit_id = _destination_unit_id,
        client_name = _destination_client_name,
        client_cnpj = _destination_client_cnpj
    WHERE id = _record_id AND client_id = _source_id;
    GET DIAGNOSTICS _affected = ROW_COUNT;

  ELSIF _record_type = 'purchase_order' THEN
    IF _source_type = 'project' THEN
      UPDATE public.purchase_orders
      SET project_id = _destination_project_id,
          client_id = _destination_client_id,
          client_unit_id = _destination_unit_id,
          allocation_type = CASE WHEN _destination_type = 'project' THEN 'projeto' ELSE 'cliente' END,
          for_stock = false
      WHERE id = _record_id AND project_id = _source_id;
    ELSE
      UPDATE public.purchase_orders
      SET project_id = _destination_project_id,
          client_id = _destination_client_id,
          client_unit_id = _destination_unit_id,
          allocation_type = CASE WHEN _destination_type = 'project' THEN 'projeto' ELSE 'cliente' END,
          for_stock = false
      WHERE id = _record_id AND client_id = _source_id;
    END IF;
    GET DIAGNOSTICS _affected = ROW_COUNT;
    IF _affected > 0 THEN
      UPDATE public.myio_orders SET project_id = _destination_project_id, client_id = _destination_client_id, client_unit_id = _destination_unit_id, client_name = COALESCE(_destination_client_name, '') WHERE purchase_order_id = _record_id;
      UPDATE public.cash_flow_payables SET project_id = _destination_project_id, client_id = _destination_client_id, client_unit_id = _destination_unit_id WHERE source_order_id = _record_id;
    END IF;

  ELSIF _record_type = 'myio_order' THEN
    IF _source_type = 'project' THEN
      UPDATE public.myio_orders SET project_id = _destination_project_id, client_id = _destination_client_id, client_unit_id = _destination_unit_id, client_name = COALESCE(_destination_client_name, '') WHERE id = _record_id AND project_id = _source_id;
    ELSE
      UPDATE public.myio_orders SET project_id = _destination_project_id, client_id = _destination_client_id, client_unit_id = _destination_unit_id, client_name = COALESCE(_destination_client_name, '') WHERE id = _record_id AND client_id = _source_id;
    END IF;
    GET DIAGNOSTICS _affected = ROW_COUNT;

  ELSIF _record_type = 'cash_flow_payable' THEN
    IF _source_type = 'project' THEN
      UPDATE public.cash_flow_payables SET project_id = _destination_project_id, client_id = _destination_client_id, client_unit_id = _destination_unit_id WHERE id = _record_id AND project_id = _source_id;
    ELSE
      UPDATE public.cash_flow_payables SET project_id = _destination_project_id, client_id = _destination_client_id, client_unit_id = _destination_unit_id WHERE id = _record_id AND client_id = _source_id;
    END IF;
    GET DIAGNOSTICS _affected = ROW_COUNT;

  ELSIF _record_type = 'unit_product' THEN
    IF _source_type <> 'project' OR _destination_type <> 'project' THEN RAISE EXCEPTION 'Dispositivos devem ser realocados para outro projeto'; END IF;
    UPDATE public.unit_products SET project_id = _destination_project_id WHERE id = _record_id AND project_id = _source_id;
    GET DIAGNOSTICS _affected = ROW_COUNT;

  ELSIF _record_type = 'technician_move' THEN
    IF _source_type <> 'project' OR _destination_type <> 'project' THEN RAISE EXCEPTION 'Movimentações de técnico devem ser realocadas para outro projeto'; END IF;
    UPDATE public.technician_moves SET project_id = _destination_project_id WHERE id = _record_id AND project_id = _source_id;
    GET DIAGNOSTICS _affected = ROW_COUNT;
  ELSE
    RAISE EXCEPTION 'Tipo de vínculo inválido';
  END IF;

  IF _affected = 0 THEN RAISE EXCEPTION 'Vínculo não encontrado ou já realocado'; END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.get_project_deletion_links(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reallocate_allocation_link(text, text, uuid, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_project_deletion_links(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reallocate_allocation_link(text, text, uuid, text, uuid) TO authenticated, service_role;