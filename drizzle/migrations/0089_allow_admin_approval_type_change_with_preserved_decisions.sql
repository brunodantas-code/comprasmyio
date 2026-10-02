CREATE OR REPLACE FUNCTION public.set_order_approval_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE final_exists boolean;
BEGIN
  IF TG_OP = 'UPDATE' AND EXISTS (
    SELECT 1 FROM public.approval_steps
    WHERE order_id = NEW.id AND status <> 'pendente'
  ) THEN
    NEW.approval_status := OLD.approval_status;
    RETURN NEW;
  END IF;
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.job_titles jt ON jt.id = p.job_title_id
    WHERE lower(jt.name) IN ('cfo','ceo') AND jt.active AND p.deleted_at IS NULL AND p.id <> NEW.requester_id
  ) INTO final_exists;
  NEW.approval_status := CASE WHEN final_exists THEN 'aguardando_aprovacao' ELSE 'aprovado' END;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_set_order_approval_status ON public.purchase_orders;
CREATE TRIGGER trg_set_order_approval_status
BEFORE INSERT OR UPDATE OF estimated_value, quantity, requester_id, request_type
ON public.purchase_orders FOR EACH ROW EXECUTE FUNCTION public.set_order_approval_status();

DROP TRIGGER IF EXISTS trg_build_approval_chain ON public.purchase_orders;
CREATE TRIGGER trg_build_approval_chain
AFTER INSERT OR UPDATE OF estimated_value, quantity, requester_id, request_type
ON public.purchase_orders FOR EACH ROW EXECUTE FUNCTION public.build_approval_chain();

DO $migration$
DECLARE definition text;
BEGIN
  SELECT pg_get_functiondef('public.admin_edit_purchase_approval(uuid,jsonb,jsonb)'::regprocedure) INTO definition;
  IF position('  _changed_fields jsonb' in definition) = 0 OR position('  UPDATE public.purchase_orders SET' in definition) = 0 OR position('  UPDATE public.cash_flow_payables SET' in definition) = 0 THEN
    RAISE EXCEPTION 'Unexpected approval edit function shape';
  END IF;
  definition := replace(definition,
    '  _changed_fields jsonb := ''{}''::jsonb;',
    '  _changed_fields jsonb := ''{}''::jsonb;' || E'\n' || '  _request_type text;' || E'\n' || '  _request_model text;' || E'\n' || '  _payment_date date;');
  definition := replace(definition,
    '  _allocation_type := COALESCE(NULLIF(_changes->>''allocation_type'', ''''), _old.allocation_type, ''interna'');',
    '  _request_type := COALESCE(NULLIF(_changes->>''request_type'', ''''), _old.request_type);' || E'\n' ||
    '  SELECT model_code INTO _request_model FROM public.request_types WHERE code = _request_type AND active;' || E'\n' ||
    '  IF _request_model IS NULL THEN RAISE EXCEPTION ''Tipo de Solicitação inválido ou inativo''; END IF;' || E'\n' ||
    '  IF _old.parent_order_id IS NOT NULL AND _request_model <> ''pagamento'' THEN RAISE EXCEPTION ''Desvincule o pagamento do Approval original antes de alterar seu tipo''; END IF;' || E'\n' ||
    '  _payment_date := CASE WHEN _request_model = ''pagamento'' THEN COALESCE(NULLIF(_changes->>''payment_date'', '''')::date, _old.payment_date) ELSE NULL END;' || E'\n' ||
    '  IF _request_model = ''pagamento'' AND _payment_date IS NULL THEN RAISE EXCEPTION ''Informe a data do pagamento''; END IF;' || E'\n' ||
    '  _allocation_type := COALESCE(NULLIF(_changes->>''allocation_type'', ''''), _old.allocation_type, ''interna'');');
  definition := replace(definition,
    '  IF _old.cost_center_id IS DISTINCT FROM _cost_center_id THEN',
    '  IF _old.request_type IS DISTINCT FROM _request_type THEN _changed_fields := _changed_fields || jsonb_build_object(''tipo_de_solicitacao'', jsonb_build_object(''antes'', _old.request_type, ''depois'', _request_type)); END IF;' || E'\n' ||
    '  IF _old.cost_center_id IS DISTINCT FROM _cost_center_id THEN');
  definition := replace(definition,
    '    allocation_type = _allocation_type, for_stock = _for_stock, cost_center_id = _cost_center_id,',
    '    allocation_type = _allocation_type, for_stock = _for_stock, cost_center_id = _cost_center_id,' || E'\n' ||
    '    request_type = _request_type, payment_date = _payment_date,');
  definition := replace(definition,
    '    item_name = _item_name, amount = _estimated_value, project_id = _project_id,',
    '    item_name = _item_name, amount = _estimated_value, request_type = _request_type, due_date = CASE WHEN _request_model = ''pagamento'' THEN _payment_date ELSE NULLIF(_changes->>''deadline_date'', '''')::date END, cash_period = date_trunc(''month'', COALESCE(_payment_date, NULLIF(_changes->>''deadline_date'', '''')::date, _old.created_at::date)::timestamp)::date, project_id = _project_id,');
  IF position('  _request_model text;' in definition) = 0 OR position('    request_type = _request_type, payment_date = _payment_date,' in definition) = 0 OR position('amount = _estimated_value, request_type = _request_type' in definition) = 0 THEN
    RAISE EXCEPTION 'Could not safely update approval edit function';
  END IF;
  EXECUTE definition;
END;
$migration$;