ALTER TABLE public.cash_flow_payables
ADD COLUMN client_unit_id UUID NULL REFERENCES public.client_units(id) ON DELETE RESTRICT;

CREATE INDEX cash_flow_payables_client_unit_id_idx
ON public.cash_flow_payables(client_unit_id);

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

  IF NOT unit_active AND (TG_OP = 'INSERT' OR OLD.client_unit_id IS DISTINCT FROM NEW.client_unit_id) THEN
    RAISE EXCEPTION 'A filial ou unidade selecionada está inativa.' USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_approved_order_to_cash_flow()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  emission_month date;
  cash_month date;
BEGIN
  IF NEW.approval_status = 'aprovado'
     AND (TG_OP = 'INSERT' OR OLD.approval_status IS DISTINCT FROM 'aprovado')
     AND COALESCE(NEW.estimated_value, 0) > 0
     AND COALESCE(NEW.request_model, '') <> 'dispositivos' THEN
    emission_month := date_trunc('month', NEW.created_at)::date;
    cash_month := date_trunc('month', COALESCE(NEW.payment_date, NEW.deadline_date, NEW.created_at::date)::timestamp)::date;
    INSERT INTO public.cash_flow_payables (
      source_order_id, approval_number, request_type, item_name, requester_id,
      project_id, client_id, client_unit_id, cost_center_id, amount, due_date,
      fiscal_period, competence_period, cash_period
    ) VALUES (
      NEW.id, NEW.approval_number, NEW.request_type, NEW.item_name, NEW.requester_id,
      NEW.project_id, NEW.client_id, NEW.client_unit_id, NEW.cost_center_id, COALESCE(NEW.estimated_value, 0),
      COALESCE(NEW.payment_date, NEW.deadline_date), emission_month, emission_month, cash_month
    ) ON CONFLICT (source_order_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

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

  INSERT INTO public.client_units (client_id, name, cnpj, active, created_by)
  VALUES (_destination_client_id, source_client.name, source_client.cnpj, true, auth.uid())
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