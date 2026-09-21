CREATE OR REPLACE FUNCTION public.enforce_myio_request_type_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.can_request_type(NEW.created_by, 'materiais') THEN
    RAISE EXCEPTION 'Usuário sem acesso a solicitações de Materiais';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.enforce_myio_request_type_access() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enforce_myio_request_type_access() TO service_role;

CREATE OR REPLACE FUNCTION public.create_myio_order_request(
  _project_id uuid,
  _client_id uuid,
  _delivery_date date,
  _is_replacement boolean,
  _client_request_reason text,
  _notes text,
  _items jsonb
)
RETURNS TABLE(myio_order_id uuid, purchase_order_id uuid, approval_number text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requester uuid := auth.uid();
  total_quantity integer;
  approval_id uuid;
  operational_id uuid;
  generated_number text;
  client_label text := '';
  project_label text := '';
  item_summary text;
BEGIN
  IF requester IS NULL THEN RAISE EXCEPTION 'É necessário estar conectado'; END IF;
  IF _delivery_date IS NULL THEN RAISE EXCEPTION 'Informe a data de entrega'; END IF;
  IF (_project_id IS NULL AND _client_id IS NULL) OR (_project_id IS NOT NULL AND _client_id IS NOT NULL) THEN
    RAISE EXCEPTION 'Selecione um Projeto ou um Cliente';
  END IF;
  IF _client_id IS NOT NULL AND _client_request_reason NOT IN ('manutencao', 'reposicao_mau_uso', 'upsell') THEN
    RAISE EXCEPTION 'Selecione Manutenção, Reposição por mal uso ou Upsell';
  END IF;
  IF _client_id IS NULL AND _client_request_reason IS NOT NULL THEN
    RAISE EXCEPTION 'A classificação de atendimento exige um Cliente';
  END IF;
  IF _items IS NULL OR jsonb_typeof(_items) <> 'array' OR jsonb_array_length(_items) = 0 OR jsonb_array_length(_items) > 100 THEN
    RAISE EXCEPTION 'Informe ao menos um dispositivo válido';
  END IF;
  IF _notes IS NOT NULL AND length(trim(_notes)) > 2000 THEN
    RAISE EXCEPTION 'As observações devem ter no máximo 2.000 caracteres';
  END IF;

  IF _project_id IS NOT NULL THEN
    SELECT name INTO project_label FROM public.projects WHERE id = _project_id;
    IF project_label IS NULL THEN RAISE EXCEPTION 'Projeto não encontrado'; END IF;
  END IF;
  IF _client_id IS NOT NULL THEN
    SELECT name INTO client_label FROM public.clients WHERE id = _client_id;
    IF client_label IS NULL THEN RAISE EXCEPTION 'Cliente não encontrado'; END IF;
  END IF;

  SELECT sum(quantity)::integer,
         string_agg(quantity::text || ' ' || trim(product), ', ' ORDER BY trim(product))
  INTO total_quantity, item_summary
  FROM jsonb_to_recordset(_items) AS x(product text, quantity integer)
  WHERE length(trim(product)) BETWEEN 1 AND 200
    AND quantity BETWEEN 1 AND 99999
    AND (
      EXISTS (SELECT 1 FROM public.materials m WHERE m.name = x.product AND m.location = 'almoxarifado')
      OR EXISTS (SELECT 1 FROM public.terceiros_materials t WHERE t.name = x.product)
    );

  IF total_quantity IS NULL OR total_quantity <= 0 THEN
    RAISE EXCEPTION 'Informe ao menos um dispositivo cadastrado com quantidade válida';
  END IF;

  IF EXISTS (
    SELECT 1 FROM jsonb_to_recordset(_items) AS x(product text, quantity integer)
    WHERE length(trim(product)) NOT BETWEEN 1 AND 200
       OR quantity NOT BETWEEN 1 AND 99999
       OR NOT (
         EXISTS (SELECT 1 FROM public.materials m WHERE m.name = x.product AND m.location = 'almoxarifado')
         OR EXISTS (SELECT 1 FROM public.terceiros_materials t WHERE t.name = x.product)
       )
  ) THEN
    RAISE EXCEPTION 'Um dos dispositivos ou quantidades é inválido';
  END IF;

  INSERT INTO public.purchase_orders (
    project_id, client_id, requester_id, item_name, quantity, estimated_value,
    recipient, requester_notes, deadline_type, deadline_date, request_type,
    request_model, allocation_type, for_stock
  ) VALUES (
    _project_id, _client_id, requester, item_summary, total_quantity, 0,
    COALESCE(NULLIF(client_label, ''), NULLIF(project_label, ''), 'myio'),
    NULLIF(trim(COALESCE(_notes, '')), ''), 'customizado', _delivery_date,
    'materiais', 'dispositivos',
    CASE WHEN _client_id IS NOT NULL THEN 'cliente' ELSE 'projeto' END, false
  )
  RETURNING id, public.purchase_orders.approval_number INTO approval_id, generated_number;

  INSERT INTO public.myio_orders (
    title, client_name, client_id, project_id, delivery_date, notes,
    created_by, is_replacement, client_request_reason, purchase_order_id
  ) VALUES (
    item_summary, client_label, _client_id, _project_id, _delivery_date,
    NULLIF(trim(COALESCE(_notes, '')), ''), requester, COALESCE(_is_replacement, false),
    _client_request_reason, approval_id
  ) RETURNING id INTO operational_id;

  INSERT INTO public.myio_order_items(order_id, product, quantity)
  SELECT operational_id, trim(x.product), x.quantity
  FROM jsonb_to_recordset(_items) AS x(product text, quantity integer);

  RETURN QUERY SELECT operational_id, approval_id, generated_number;
END;
$$;
REVOKE ALL ON FUNCTION public.create_myio_order_request(uuid, uuid, date, boolean, text, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_myio_order_request(uuid, uuid, date, boolean, text, text, jsonb) TO authenticated;