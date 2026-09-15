ALTER TABLE public.profiles
  ADD COLUMN device_approval_limit integer NOT NULL DEFAULT 0,
  ADD COLUMN device_tier2_limit integer NOT NULL DEFAULT 0,
  ADD COLUMN device_tier3_limit integer NOT NULL DEFAULT 0;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_device_limits_nonnegative
  CHECK (device_approval_limit >= 0 AND device_tier2_limit >= 0 AND device_tier3_limit >= 0);

ALTER TABLE public.myio_orders
  ADD COLUMN client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  ADD COLUMN client_request_reason text,
  ADD COLUMN purchase_order_id uuid UNIQUE REFERENCES public.purchase_orders(id) ON DELETE SET NULL;

ALTER TABLE public.myio_orders
  ADD CONSTRAINT myio_orders_client_reason_valid
  CHECK (
    (client_id IS NULL AND client_request_reason IS NULL)
    OR
    (client_id IS NOT NULL AND client_request_reason IN ('manutencao', 'reposicao_mau_uso', 'upsell'))
  );

CREATE INDEX idx_myio_orders_created_by ON public.myio_orders(created_by);
CREATE INDEX idx_myio_orders_client_id ON public.myio_orders(client_id);
CREATE INDEX idx_myio_orders_purchase_order_id ON public.myio_orders(purchase_order_id);

CREATE POLICY "myio_orders_owner_select" ON public.myio_orders
  FOR SELECT TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "myio_order_items_owner_select" ON public.myio_order_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.myio_orders o
      WHERE o.id = myio_order_items.order_id
        AND o.created_by = auth.uid()
    )
  );

CREATE OR REPLACE FUNCTION public.validate_myio_operational_release()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  linked_status text;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  IF NEW.purchase_order_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT approval_status INTO linked_status
  FROM public.purchase_orders
  WHERE id = NEW.purchase_order_id;

  IF linked_status IS DISTINCT FROM 'aprovado' THEN
    RAISE EXCEPTION 'A solicitação só pode seguir para produção após a aprovação final';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_myio_operational_release
BEFORE UPDATE OF status ON public.myio_orders
FOR EACH ROW EXECUTE FUNCTION public.validate_myio_operational_release();

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
BEGIN
  IF requester IS NULL THEN
    RAISE EXCEPTION 'É necessário estar conectado';
  END IF;
  IF _delivery_date IS NULL THEN
    RAISE EXCEPTION 'Informe a data de entrega';
  END IF;
  IF _project_id IS NULL AND _client_id IS NULL THEN
    RAISE EXCEPTION 'Selecione um Projeto, um Cliente ou ambos';
  END IF;
  IF _client_id IS NOT NULL AND _client_request_reason NOT IN ('manutencao', 'reposicao_mau_uso', 'upsell') THEN
    RAISE EXCEPTION 'Selecione Manutenção, Reposição por mal uso ou Upsell';
  END IF;
  IF _client_id IS NULL AND _client_request_reason IS NOT NULL THEN
    RAISE EXCEPTION 'A classificação de atendimento exige um Cliente';
  END IF;
  IF _items IS NULL OR jsonb_typeof(_items) <> 'array' OR jsonb_array_length(_items) = 0 OR jsonb_array_length(_items) > 100 THEN
    RAISE EXCEPTION 'Informe ao menos um produto válido';
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

  SELECT sum(quantity)::integer INTO total_quantity
  FROM jsonb_to_recordset(_items) AS x(product text, quantity integer)
  WHERE length(trim(product)) BETWEEN 1 AND 200
    AND quantity BETWEEN 1 AND 99999
    AND (
      EXISTS (SELECT 1 FROM public.materials m WHERE m.name = x.product AND m.location = 'almoxarifado')
      OR EXISTS (SELECT 1 FROM public.terceiros_materials t WHERE t.name = x.product)
    );

  IF total_quantity IS NULL OR total_quantity <= 0 THEN
    RAISE EXCEPTION 'Informe ao menos um produto cadastrado com quantidade válida';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_to_recordset(_items) AS x(product text, quantity integer)
    WHERE length(trim(product)) NOT BETWEEN 1 AND 200
       OR quantity NOT BETWEEN 1 AND 99999
       OR NOT (
         EXISTS (SELECT 1 FROM public.materials m WHERE m.name = x.product AND m.location = 'almoxarifado')
         OR EXISTS (SELECT 1 FROM public.terceiros_materials t WHERE t.name = x.product)
       )
  ) THEN
    RAISE EXCEPTION 'Um dos produtos ou quantidades é inválido';
  END IF;

  INSERT INTO public.purchase_orders (
    project_id, client_id, requester_id, item_name, quantity, estimated_value,
    recipient, requester_notes, deadline_type, deadline_date, request_type,
    request_model, allocation_type, for_stock
  ) VALUES (
    _project_id, _client_id, requester, 'Dispositivos myio', total_quantity, 0,
    COALESCE(NULLIF(client_label, ''), NULLIF(project_label, ''), 'myio'),
    NULLIF(trim(COALESCE(_notes, '')), ''), 'customizado', _delivery_date,
    'dispositivos', 'dispositivos',
    CASE WHEN _client_id IS NOT NULL THEN 'cliente' ELSE 'projeto' END, false
  )
  RETURNING id, public.purchase_orders.approval_number
  INTO approval_id, generated_number;

  INSERT INTO public.myio_orders (
    title, client_name, client_id, project_id, delivery_date, notes,
    created_by, is_replacement, client_request_reason, purchase_order_id
  ) VALUES (
    'Dispositivos myio', client_label, _client_id, _project_id, _delivery_date,
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

CREATE OR REPLACE FUNCTION public.build_approval_chain()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  p RECORD;
  v numeric := COALESCE(NEW.estimated_value, 0);
  qty integer := COALESCE(NEW.quantity, 0);
  max_levels integer := 0;
  hops integer := 0;
  idx integer := 0;
  r RECORD;
  cfg RECORD;
  dual_idx integer;
  u RECORD;
  seen uuid[] := '{}';
  cfo_id uuid;
  ceo_id uuid;
  final_id uuid;
  final_lbl text;
  auto_ok boolean := false;
  cur_title uuid;
  nxt_title uuid;
  nxt_name text;
  seen_titles uuid[] := '{}';
  levels_used integer := 0;
  added_any boolean;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF EXISTS (SELECT 1 FROM public.approval_steps WHERE order_id = NEW.id AND status <> 'pendente') THEN RETURN NEW; END IF;
    DELETE FROM public.approval_steps WHERE order_id = NEW.id;
  END IF;

  SELECT * INTO p FROM public.profiles WHERE id = NEW.requester_id;
  IF p IS NULL THEN RETURN NEW; END IF;

  SELECT p2.id INTO cfo_id FROM public.profiles p2 JOIN public.job_titles jt ON jt.id = p2.job_title_id
  WHERE lower(jt.name) = 'cfo' AND jt.active AND p2.deleted_at IS NULL AND p2.id <> NEW.requester_id
  ORDER BY p2.created_at LIMIT 1;
  SELECT p2.id INTO ceo_id FROM public.profiles p2 JOIN public.job_titles jt ON jt.id = p2.job_title_id
  WHERE lower(jt.name) = 'ceo' AND jt.active AND p2.deleted_at IS NULL AND p2.id <> NEW.requester_id
  ORDER BY p2.created_at LIMIT 1;

  IF NEW.request_model = 'pagamento' THEN
    IF public.has_job_title_name(NEW.requester_id, 'Financeiro') THEN
      IF cfo_id IS NULL THEN RAISE EXCEPTION 'Nenhum usuário está cadastrado no cargo CFO'; END IF;
      INSERT INTO public.approval_steps(order_id, step_index, role_label, approver_id)
      VALUES (NEW.id, 1, 'Aprovação de Pagamento — CFO', cfo_id);
    ELSE
      added_any := false;
      FOR u IN SELECT p2.id AS user_id FROM public.profiles p2 JOIN public.job_titles jt ON jt.id = p2.job_title_id
        WHERE lower(jt.name) = 'financeiro' AND jt.active AND p2.deleted_at IS NULL AND p2.id <> NEW.requester_id ORDER BY p2.id
      LOOP
        INSERT INTO public.approval_steps(order_id, step_index, role_label, approver_id)
        VALUES (NEW.id, 1, 'Aprovação de Pagamento — Financeiro', u.user_id);
        added_any := true;
      END LOOP;
      IF NOT added_any THEN RAISE EXCEPTION 'Nenhum usuário está cadastrado no cargo Financeiro'; END IF;
    END IF;
    UPDATE public.purchase_orders SET approval_status = 'aguardando_aprovacao' WHERE id = NEW.id;
    RETURN NEW;
  END IF;

  IF cfo_id IS NOT NULL THEN final_id := cfo_id; final_lbl := 'Aprovação final — CFO';
  ELSIF ceo_id IS NOT NULL THEN final_id := ceo_id; final_lbl := 'Aprovação final — CEO';
  ELSE final_id := NULL;
  END IF;

  IF NEW.request_model = 'dispositivos' THEN
    IF qty <= COALESCE(p.device_approval_limit, 0) THEN max_levels := 0; auto_ok := true;
    ELSIF qty <= COALESCE(p.device_tier2_limit, 0) THEN max_levels := 2;
    ELSIF qty <= COALESCE(p.device_tier3_limit, 0) THEN max_levels := 3;
    ELSE max_levels := 5;
    END IF;
  ELSE
    IF v <= COALESCE(p.approval_limit, 0) THEN max_levels := 0; auto_ok := true;
    ELSIF v <= COALESCE(p.tier2_limit, 50000) THEN max_levels := 2;
    ELSIF v <= COALESCE(p.tier3_limit, 250000) THEN max_levels := 3;
    ELSE max_levels := 5;
    END IF;
  END IF;

  IF NOT auto_ok THEN
    cur_title := p.job_title_id;
    WHILE levels_used < max_levels AND hops < 100 LOOP
      hops := hops + 1;
      IF cur_title IS NULL THEN EXIT; END IF;
      SELECT h.approver_job_title_id, jt.name INTO nxt_title, nxt_name
      FROM public.job_title_hierarchy h LEFT JOIN public.job_titles jt ON jt.id = h.approver_job_title_id
      WHERE h.job_title_id = cur_title;
      EXIT WHEN nxt_title IS NULL;
      EXIT WHEN nxt_title = ANY(seen_titles);
      seen_titles := array_append(seen_titles, nxt_title);
      added_any := false;
      FOR u IN SELECT p2.id AS user_id FROM public.profiles p2
        WHERE p2.job_title_id = nxt_title AND p2.deleted_at IS NULL AND p2.id <> NEW.requester_id ORDER BY p2.id
      LOOP
        IF NOT (u.user_id = ANY(seen)) AND (final_id IS NULL OR u.user_id <> final_id) THEN
          idx := idx + 1;
          INSERT INTO public.approval_steps(order_id, step_index, role_label, approver_id)
          VALUES (NEW.id, idx, 'Aprovação — ' || nxt_name, u.user_id);
          seen := array_append(seen, u.user_id);
          added_any := true;
        END IF;
      END LOOP;
      IF added_any THEN levels_used := levels_used + 1; END IF;
      cur_title := nxt_title;
    END LOOP;

    FOR r IN SELECT * FROM public.approval_rules WHERE active AND
      (request_types IS NULL OR cardinality(request_types) = 0 OR NEW.request_type = ANY(request_types) OR NEW.request_model = ANY(request_types))
      ORDER BY position, created_at
    LOOP
      IF (r.approver_id IS NULL OR NOT (r.approver_id = ANY(seen))) AND (final_id IS NULL OR r.approver_id IS DISTINCT FROM final_id) THEN
        idx := idx + 1;
        INSERT INTO public.approval_steps(order_id, step_index, role_label, approver_id)
        VALUES (NEW.id, idx, r.name, r.approver_id);
        IF r.approver_id IS NOT NULL THEN seen := array_append(seen, r.approver_id); END IF;
      END IF;
    END LOOP;

    SELECT * INTO cfg FROM public.approval_settings WHERE id;
    IF NEW.request_model <> 'dispositivos' AND cfg IS NOT NULL AND cfg.dual_approval_enabled AND v > COALESCE(cfg.dual_approval_threshold, 100000) THEN
      dual_idx := idx + 1;
      FOR u IN SELECT DISTINCT ON (lower(jt.name)) lower(jt.name) AS title_name, p2.id AS user_id
        FROM public.profiles p2 JOIN public.job_titles jt ON jt.id = p2.job_title_id
        WHERE lower(jt.name) IN ('cfo','ceo') AND jt.active AND p2.deleted_at IS NULL
        ORDER BY lower(jt.name), p2.created_at
      LOOP
        IF NOT (u.user_id = ANY(seen)) AND (final_id IS NULL OR u.user_id <> final_id) THEN
          INSERT INTO public.approval_steps(order_id, step_index, role_label, approver_id)
          VALUES (NEW.id, dual_idx, CASE WHEN u.title_name = 'cfo' THEN 'Dupla aprovação — CFO' ELSE 'Dupla aprovação — CEO' END, u.user_id);
          seen := array_append(seen, u.user_id);
          idx := dual_idx;
        END IF;
      END LOOP;
    END IF;
  END IF;

  IF final_id IS NOT NULL THEN
    idx := idx + 1;
    INSERT INTO public.approval_steps(order_id, step_index, role_label, approver_id)
    VALUES (NEW.id, idx, final_lbl, final_id);
  END IF;

  IF idx = 0 THEN
    UPDATE public.purchase_orders SET approval_status = 'aprovado', approved_at = COALESCE(approved_at, now())
    WHERE id = NEW.id AND approval_status <> 'aprovado';
  ELSE
    UPDATE public.purchase_orders SET approval_status = 'aguardando_aprovacao'
    WHERE id = NEW.id AND approval_status = 'aprovado';
  END IF;
  RETURN NEW;
END;
$$;