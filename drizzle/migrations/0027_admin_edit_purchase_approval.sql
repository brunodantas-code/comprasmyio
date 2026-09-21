CREATE OR REPLACE FUNCTION public.admin_edit_purchase_approval(_order_id uuid, _changes jsonb, _items jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _old public.purchase_orders%ROWTYPE;
  _project_id uuid;
  _client_id uuid;
  _client_unit_id uuid;
  _cost_center_id uuid;
  _allocation_type text;
  _for_stock boolean;
  _item_name text;
  _quantity integer;
  _estimated_value numeric;
  _budget numeric;
  _committed_before numeric;
  _changed_fields jsonb := '{}'::jsonb;
  _item jsonb;
  _item_id uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Apenas administradores podem editar Approvals';
  END IF;

  SELECT * INTO _old FROM public.purchase_orders WHERE id = _order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Approval não encontrado'; END IF;

  _allocation_type := COALESCE(NULLIF(_changes->>'allocation_type', ''), _old.allocation_type, 'interna');
  IF _allocation_type NOT IN ('interna', 'projeto', 'cliente', 'estoque') THEN
    RAISE EXCEPTION 'Alocação inválida';
  END IF;

  _project_id := NULLIF(_changes->>'project_id', '')::uuid;
  _client_id := NULLIF(_changes->>'client_id', '')::uuid;
  _client_unit_id := NULLIF(_changes->>'client_unit_id', '')::uuid;
  _cost_center_id := NULLIF(_changes->>'cost_center_id', '')::uuid;
  _for_stock := _allocation_type = 'estoque';

  IF _allocation_type = 'projeto' THEN
    IF _project_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.projects WHERE id = _project_id) THEN RAISE EXCEPTION 'Selecione um projeto válido'; END IF;
    _client_id := NULL; _client_unit_id := NULL;
  ELSIF _allocation_type = 'cliente' THEN
    _project_id := NULL;
    IF _client_unit_id IS NOT NULL THEN
      SELECT client_id INTO _client_id FROM public.client_units WHERE id = _client_unit_id AND active;
      IF _client_id IS NULL THEN RAISE EXCEPTION 'Selecione uma unidade ativa'; END IF;
    ELSIF _client_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.clients WHERE id = _client_id) THEN
      RAISE EXCEPTION 'Selecione um cliente válido';
    END IF;
  ELSE
    _project_id := NULL; _client_id := NULL; _client_unit_id := NULL;
  END IF;

  IF _cost_center_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.cost_centers WHERE id = _cost_center_id AND active) THEN
    RAISE EXCEPTION 'Selecione um centro de custo ativo';
  END IF;

  IF jsonb_typeof(_items) = 'array' AND jsonb_array_length(_items) > 0 THEN
    FOR _item IN SELECT value FROM jsonb_array_elements(_items)
    LOOP
      _item_id := NULLIF(_item->>'id', '')::uuid;
      IF _item_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.purchase_order_items WHERE id = _item_id AND order_id = _order_id) THEN
        RAISE EXCEPTION 'Item do Approval inválido';
      END IF;
      IF COALESCE((_item->>'quantity')::integer, 0) <= 0 OR COALESCE((_item->>'estimated_unit_value')::numeric, 0) < 0 THEN
        RAISE EXCEPTION 'Quantidade e valor dos itens devem ser válidos';
      END IF;
      UPDATE public.purchase_order_items
      SET item_name = COALESCE(NULLIF(trim(_item->>'item_name'), ''), item_name),
          item_link = NULLIF(trim(_item->>'item_link'), ''),
          quantity = (_item->>'quantity')::integer,
          estimated_unit_value = (_item->>'estimated_unit_value')::numeric
      WHERE id = _item_id AND order_id = _order_id;
    END LOOP;
    SELECT string_agg(item_name, ', ' ORDER BY position), sum(quantity), sum(quantity * estimated_unit_value)
      INTO _item_name, _quantity, _estimated_value
    FROM public.purchase_order_items WHERE order_id = _order_id;
  ELSE
    _item_name := COALESCE(NULLIF(trim(_changes->>'item_name'), ''), _old.item_name);
    _quantity := COALESCE((_changes->>'quantity')::integer, _old.quantity);
    _estimated_value := COALESCE((_changes->>'estimated_value')::numeric, _old.estimated_value);
    IF _quantity <= 0 OR _estimated_value < 0 THEN RAISE EXCEPTION 'Quantidade e valor devem ser válidos'; END IF;
  END IF;

  IF _project_id IS NOT NULL THEN
    SELECT budget INTO _budget FROM public.projects WHERE id = _project_id;
    SELECT COALESCE(sum(estimated_value), 0) INTO _committed_before
    FROM public.purchase_orders
    WHERE project_id = _project_id AND id <> _order_id AND status <> 'cancelado';
  ELSE
    _budget := NULL; _committed_before := NULL;
  END IF;

  IF _old.project_id IS DISTINCT FROM _project_id OR _old.client_id IS DISTINCT FROM _client_id OR _old.client_unit_id IS DISTINCT FROM _client_unit_id OR _old.allocation_type IS DISTINCT FROM _allocation_type THEN _changed_fields := _changed_fields || '{"alocacao":true}'::jsonb; END IF;
  IF _old.cost_center_id IS DISTINCT FROM _cost_center_id THEN _changed_fields := _changed_fields || '{"centro_de_custo":true}'::jsonb; END IF;
  IF _old.item_name IS DISTINCT FROM _item_name OR _old.quantity IS DISTINCT FROM _quantity OR _old.estimated_value IS DISTINCT FROM _estimated_value THEN _changed_fields := _changed_fields || '{"itens_e_valores":true}'::jsonb; END IF;
  IF _old.recipient IS DISTINCT FROM COALESCE(_changes->>'recipient', '') OR _old.delivery_point IS DISTINCT FROM NULLIF(_changes->>'delivery_point', '') THEN _changed_fields := _changed_fields || '{"entrega":true}'::jsonb; END IF;
  IF _old.requester_notes IS DISTINCT FROM NULLIF(_changes->>'requester_notes', '') OR _old.buyer_notes IS DISTINCT FROM NULLIF(_changes->>'buyer_notes', '') THEN _changed_fields := _changed_fields || '{"observacoes":true}'::jsonb; END IF;

  UPDATE public.purchase_orders SET
    project_id = _project_id, client_id = _client_id, client_unit_id = _client_unit_id,
    allocation_type = _allocation_type, for_stock = _for_stock, cost_center_id = _cost_center_id,
    item_name = _item_name, item_link = NULLIF(trim(_changes->>'item_link'), ''), quantity = _quantity, estimated_value = _estimated_value,
    recipient = COALESCE(_changes->>'recipient', ''), delivery_point = NULLIF(_changes->>'delivery_point', ''),
    deadline_type = COALESCE(NULLIF(_changes->>'deadline_type', ''), _old.deadline_type::text)::public.deadline_type,
    deadline_date = NULLIF(_changes->>'deadline_date', '')::date,
    delivery_forecast = NULLIF(_changes->>'delivery_forecast', '')::date,
    requester_notes = NULLIF(trim(_changes->>'requester_notes'), ''), buyer_notes = NULLIF(trim(_changes->>'buyer_notes'), ''),
    budget_snapshot = _budget, committed_before_snapshot = _committed_before,
    projected_committed_snapshot = CASE WHEN _budget IS NULL THEN NULL ELSE _committed_before + _estimated_value END,
    budget_exceeded = CASE WHEN _budget IS NULL OR _budget <= 0 THEN false ELSE _committed_before + _estimated_value > _budget END
  WHERE id = _order_id;

  UPDATE public.cash_flow_payables SET
    item_name = _item_name, amount = _estimated_value, project_id = _project_id,
    client_id = _client_id, client_unit_id = _client_unit_id, cost_center_id = _cost_center_id
  WHERE source_order_id = _order_id;

  UPDATE public.myio_orders SET
    project_id = _project_id, client_id = _client_id, client_unit_id = _client_unit_id,
    title = _item_name
  WHERE purchase_order_id = _order_id;

  INSERT INTO public.order_logs(order_id, actor_id, action, details)
  VALUES (_order_id, auth.uid(), 'approval_editado', jsonb_build_object('campos', _changed_fields, 'approval', _old.approval_number));
END;
$$;

REVOKE ALL ON FUNCTION public.admin_edit_purchase_approval(uuid, jsonb, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_edit_purchase_approval(uuid, jsonb, jsonb) TO authenticated, service_role;