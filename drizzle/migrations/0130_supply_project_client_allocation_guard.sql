CREATE OR REPLACE FUNCTION public.resolve_supply_purchase_allocation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE project_client uuid; project_unit uuid; effective_type text;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.project_id IS NOT DISTINCT FROM OLD.project_id AND NEW.client_id IS NOT DISTINCT FROM OLD.client_id AND NEW.client_unit_id IS NOT DISTINCT FROM OLD.client_unit_id AND NEW.allocation_type IS NOT DISTINCT FROM OLD.allocation_type AND NEW.for_stock IS NOT DISTINCT FROM OLD.for_stock THEN RETURN NEW; END IF;
  END IF;
  effective_type := COALESCE(NEW.allocation_type, CASE WHEN NEW.for_stock THEN 'estoque' WHEN NEW.project_id IS NOT NULL THEN 'projeto' WHEN NEW.client_id IS NOT NULL THEN 'cliente' ELSE 'interna' END);
  IF effective_type = 'projeto' THEN
    IF NEW.for_stock THEN RAISE EXCEPTION 'Projeto e Estoque não podem ser selecionados simultaneamente.' USING ERRCODE = '23514'; END IF;
    SELECT client_id, client_unit_id INTO project_client, project_unit FROM public.projects WHERE id = NEW.project_id FOR SHARE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Selecione um projeto válido.' USING ERRCODE = '23514'; END IF;
    IF project_client IS NULL THEN RAISE EXCEPTION 'Vincule um Cliente ao Projeto no Cadastro antes de solicitar a compra.' USING ERRCODE = '23514'; END IF;
    IF NEW.client_id IS NOT NULL AND NEW.client_id IS DISTINCT FROM project_client THEN RAISE EXCEPTION 'O Cliente deve ser o Cliente vinculado ao Projeto.' USING ERRCODE = '23514'; END IF;
    IF NEW.client_unit_id IS NOT NULL AND NEW.client_unit_id IS DISTINCT FROM project_unit THEN RAISE EXCEPTION 'A unidade deve ser a unidade vinculada ao Projeto.' USING ERRCODE = '23514'; END IF;
    NEW.client_id := project_client; NEW.client_unit_id := project_unit;
  ELSIF effective_type = 'cliente' THEN
    IF NEW.project_id IS NOT NULL OR NEW.for_stock THEN RAISE EXCEPTION 'Sustentação é alocada diretamente no Cliente, sem Projeto ou Estoque.' USING ERRCODE = '23514'; END IF;
    IF NEW.client_id IS NULL AND NEW.client_unit_id IS NOT NULL THEN SELECT client_id INTO NEW.client_id FROM public.client_units WHERE id = NEW.client_unit_id AND active; END IF;
    IF NEW.client_id IS NULL THEN RAISE EXCEPTION 'Selecione um Cliente para Sustentação.' USING ERRCODE = '23514'; END IF;
  ELSIF effective_type IN ('estoque', 'interna') THEN
    IF NEW.project_id IS NOT NULL OR (COALESCE(NEW.request_model, '') <> 'rh' AND (NEW.client_id IS NOT NULL OR NEW.client_unit_id IS NOT NULL)) THEN RAISE EXCEPTION 'Esta finalidade não permite vincular Projeto ou Cliente.' USING ERRCODE = '23514'; END IF;
  ELSE RAISE EXCEPTION 'Alocação inválida.' USING ERRCODE = '23514'; END IF;
  NEW.allocation_type := effective_type; NEW.for_stock := effective_type = 'estoque';
  RETURN NEW;
END;
$$;
CREATE TRIGGER b_resolve_supply_purchase_allocation BEFORE INSERT OR UPDATE OF project_id, client_id, client_unit_id, allocation_type, for_stock ON public.purchase_orders FOR EACH ROW EXECUTE FUNCTION public.resolve_supply_purchase_allocation();

DO $$
DECLARE definition text;
BEGIN
 SELECT pg_get_functiondef('public.admin_edit_purchase_approval(uuid,jsonb,jsonb)'::regprocedure) INTO definition;
 IF strpos(definition, '_client_id := NULL; _client_unit_id := NULL;') = 0 THEN RAISE EXCEPTION 'A função de edição mudou; revise a alocação antes de aplicar.'; END IF;
 definition := replace(definition, '_client_id := NULL; _client_unit_id := NULL;', 'SELECT client_id, client_unit_id INTO _client_id, _client_unit_id FROM public.projects WHERE id = _project_id; IF _client_id IS NULL THEN RAISE EXCEPTION ''Vincule um Cliente ao Projeto no Cadastro antes de solicitar a compra.''; END IF;');
 EXECUTE definition;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_supply_allocation_to_payable()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 IF NEW.project_id IS DISTINCT FROM OLD.project_id OR NEW.client_id IS DISTINCT FROM OLD.client_id OR NEW.client_unit_id IS DISTINCT FROM OLD.client_unit_id OR NEW.cost_center_id IS DISTINCT FROM OLD.cost_center_id THEN
   UPDATE public.cash_flow_payables SET project_id = NEW.project_id, client_id = NEW.client_id, client_unit_id = NEW.client_unit_id, cost_center_id = NEW.cost_center_id WHERE source_order_id = NEW.id;
 END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER sync_supply_allocation_to_payable AFTER UPDATE OF project_id, client_id, client_unit_id, cost_center_id ON public.purchase_orders FOR EACH ROW EXECUTE FUNCTION public.sync_supply_allocation_to_payable();