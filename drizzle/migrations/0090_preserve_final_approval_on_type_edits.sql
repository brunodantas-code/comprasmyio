CREATE OR REPLACE FUNCTION public.set_order_approval_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE final_exists boolean;
BEGIN
  IF TG_OP = 'UPDATE' AND (OLD.approval_status = 'aprovado' OR EXISTS (
    SELECT 1 FROM public.approval_steps WHERE order_id = NEW.id AND status <> 'pendente'
  )) THEN
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

DO $migration$
DECLARE definition text;
BEGIN
  SELECT pg_get_functiondef('public.admin_edit_purchase_approval(uuid,jsonb,jsonb)'::regprocedure) INTO definition;
  IF position('  _for_stock := _allocation_type = ''estoque'';' in definition) = 0 THEN
    RAISE EXCEPTION 'Unexpected approval edit function shape';
  END IF;
  definition := replace(definition,
    '  _for_stock := _allocation_type = ''estoque'';',
    '  IF _request_model = ''pagamento'' AND _cost_center_id IS NULL THEN RAISE EXCEPTION ''Selecione o Centro de Custo''; END IF;' || E'\n' ||
    '  _for_stock := _allocation_type = ''estoque'';');
  EXECUTE definition;
END;
$migration$;