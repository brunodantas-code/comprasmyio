ALTER TABLE public.unit_products
ADD COLUMN destination_code text;

UPDATE public.unit_products
SET destination_code = CASE
  WHEN moved_to = 'almoxarifado' THEN 'myio'
  WHEN moved_to IN ('tecnico', 'perdido', 'avariado') THEN moved_to
  WHEN moved_to IS NULL AND moved_at IS NOT NULL AND project_id IS NOT NULL THEN 'cliente'
  ELSE NULL
END
WHERE destination_code IS NULL;

ALTER TABLE public.unit_products
ADD CONSTRAINT unit_products_destination_code_fkey
FOREIGN KEY (destination_code) REFERENCES public.stock_destinations(code)
ON UPDATE CASCADE ON DELETE RESTRICT;

DROP TRIGGER IF EXISTS request_types_protect_code ON public.request_types;

CREATE OR REPLACE FUNCTION public.protect_request_type_code()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.is_system THEN
      RAISE EXCEPTION 'Tipos de Solicitação estruturais não podem ser excluídos. Desative o tipo.';
    END IF;
    IF EXISTS (SELECT 1 FROM public.approval_rules r WHERE OLD.code = ANY(r.request_types)) THEN
      RAISE EXCEPTION 'Este tipo possui vínculos em Etapas Adicionais. Realoque-os antes de excluir.';
    END IF;
    RETURN OLD;
  END IF;
  IF NEW.code IS DISTINCT FROM OLD.code THEN
    RAISE EXCEPTION 'O código interno do Tipo de Solicitação não pode ser alterado.';
  END IF;
  IF OLD.is_system AND NEW.model_code IS DISTINCT FROM OLD.model_code THEN
    RAISE EXCEPTION 'O modelo de um Tipo de Solicitação estrutural não pode ser alterado.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER request_types_protect_code
BEFORE UPDATE OF code OR DELETE ON public.request_types
FOR EACH ROW EXECUTE FUNCTION public.protect_request_type_code();

ALTER TABLE public.access_profile_request_types
DROP CONSTRAINT IF EXISTS access_profile_request_types_request_type_code_fkey;
ALTER TABLE public.access_profile_request_types
ADD CONSTRAINT access_profile_request_types_request_type_code_fkey
FOREIGN KEY (request_type_code) REFERENCES public.request_types(code)
ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE public.user_request_type_permissions
DROP CONSTRAINT IF EXISTS user_request_type_permissions_request_type_code_fkey;
ALTER TABLE public.user_request_type_permissions
ADD CONSTRAINT user_request_type_permissions_request_type_code_fkey
FOREIGN KEY (request_type_code) REFERENCES public.request_types(code)
ON UPDATE CASCADE ON DELETE RESTRICT;

CREATE OR REPLACE FUNCTION public.get_diversos_deletion_links(_registry text, _source_code text)
RETURNS TABLE(record_key text, record_type text, record_label text, record_detail text)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NOT public.can_manage_limits(auth.uid()) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  IF _registry = 'request_type' THEN
    RETURN QUERY
      SELECT 'purchase_order:' || po.id::text, 'Solicitação', COALESCE(po.approval_number, 'Solicitação sem número'), po.item_name
      FROM public.purchase_orders po WHERE po.request_type = _source_code
      UNION ALL
      SELECT 'access_profile:' || aprt.profile_code, 'Perfil de acesso', apd.name, 'Permissão para criar este tipo de solicitação'
      FROM public.access_profile_request_types aprt
      JOIN public.access_profile_definitions apd ON apd.code = aprt.profile_code
      WHERE aprt.request_type_code = _source_code
      UNION ALL
      SELECT 'user_permission:' || urtp.user_id::text, 'Permissão individual', COALESCE(p.full_name, p.email, 'Usuário'), 'Permissão para criar este tipo de solicitação'
      FROM public.user_request_type_permissions urtp
      LEFT JOIN public.profiles p ON p.id = urtp.user_id
      WHERE urtp.request_type_code = _source_code
      UNION ALL
      SELECT 'approval_rule:' || ar.id::text, 'Etapa adicional', ar.name, 'Aplicada a este tipo de solicitação'
      FROM public.approval_rules ar WHERE _source_code = ANY(ar.request_types)
      ORDER BY 2, 3;
  ELSIF _registry = 'additional_step_type' THEN
    RETURN QUERY
      SELECT 'approval_rule:' || ar.id::text, 'Etapa adicional', ar.name, COALESCE(ar.category, 'Regra do Approval Workflow')
      FROM public.approval_rules ar WHERE ar.step_type = _source_code
      ORDER BY 3;
  ELSIF _registry = 'stock_destination' THEN
    RETURN QUERY
      SELECT 'unit_product:' || up.id::text, 'Dispositivo', COALESCE(up.label, up.product, 'Dispositivo sem identificação'), COALESCE(up.client_name, up.move_notes, 'Movimentação de estoque')
      FROM public.unit_products up WHERE up.destination_code = _source_code
      ORDER BY 3;
  ELSE
    RAISE EXCEPTION 'Cadastro inválido';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.reallocate_diversos_link(
  _registry text,
  _record_key text,
  _source_code text,
  _destination_code text
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  _record_type text := split_part(_record_key, ':', 1);
  _record_id text := substring(_record_key from position(':' in _record_key) + 1);
  _rows integer := 0;
  _destination_exists boolean := false;
  _stored_destination text;
BEGIN
  IF NOT public.can_manage_limits(auth.uid()) THEN RAISE EXCEPTION 'Acesso negado'; END IF;
  IF _source_code = _destination_code THEN RAISE EXCEPTION 'Selecione um destino diferente'; END IF;

  IF _registry = 'request_type' THEN
    SELECT EXISTS(SELECT 1 FROM public.request_types WHERE code = _destination_code AND active) INTO _destination_exists;
    IF NOT _destination_exists THEN RAISE EXCEPTION 'O tipo de destino é inválido ou está inativo'; END IF;
    CASE _record_type
      WHEN 'purchase_order' THEN
        UPDATE public.purchase_orders SET request_type = _destination_code WHERE id = _record_id::uuid AND request_type = _source_code;
      WHEN 'access_profile' THEN
        DELETE FROM public.access_profile_request_types WHERE profile_code = _record_id AND request_type_code = _source_code;
        INSERT INTO public.access_profile_request_types(profile_code, request_type_code)
        VALUES (_record_id, _destination_code) ON CONFLICT DO NOTHING;
      WHEN 'user_permission' THEN
        DELETE FROM public.user_request_type_permissions WHERE user_id = _record_id::uuid AND request_type_code = _source_code;
        INSERT INTO public.user_request_type_permissions(user_id, request_type_code)
        VALUES (_record_id::uuid, _destination_code) ON CONFLICT DO NOTHING;
      WHEN 'approval_rule' THEN
        UPDATE public.approval_rules
        SET request_types = array_replace(request_types, _source_code, _destination_code)
        WHERE id = _record_id::uuid AND _source_code = ANY(request_types);
      ELSE RAISE EXCEPTION 'Vínculo inválido';
    END CASE;
  ELSIF _registry = 'additional_step_type' THEN
    SELECT EXISTS(SELECT 1 FROM public.additional_step_types WHERE code = _destination_code AND active) INTO _destination_exists;
    IF NOT _destination_exists THEN RAISE EXCEPTION 'O tipo de destino é inválido ou está inativo'; END IF;
    IF _record_type <> 'approval_rule' THEN RAISE EXCEPTION 'Vínculo inválido'; END IF;
    UPDATE public.approval_rules SET step_type = _destination_code
    WHERE id = _record_id::uuid AND step_type = _source_code;
  ELSIF _registry = 'stock_destination' THEN
    SELECT EXISTS(SELECT 1 FROM public.stock_destinations WHERE code = _destination_code AND active) INTO _destination_exists;
    IF NOT _destination_exists THEN RAISE EXCEPTION 'O destino é inválido ou está inativo'; END IF;
    IF _record_type <> 'unit_product' THEN RAISE EXCEPTION 'Vínculo inválido'; END IF;
    IF _destination_code = 'cliente' AND NOT EXISTS (SELECT 1 FROM public.unit_products WHERE id = _record_id::uuid AND project_id IS NOT NULL) THEN
      RAISE EXCEPTION 'Este dispositivo precisa de um projeto antes de ser realocado para Cliente';
    END IF;
    _stored_destination := CASE _destination_code WHEN 'myio' THEN 'almoxarifado' WHEN 'cliente' THEN NULL ELSE _destination_code END;
    UPDATE public.unit_products
    SET destination_code = _destination_code,
        moved_to = _stored_destination,
        moved_technician = CASE WHEN _destination_code = 'tecnico' THEN moved_technician ELSE NULL END
    WHERE id = _record_id::uuid AND destination_code = _source_code;
  ELSE
    RAISE EXCEPTION 'Cadastro inválido';
  END IF;

  GET DIAGNOSTICS _rows = ROW_COUNT;
  IF _rows = 0 AND _record_type NOT IN ('access_profile', 'user_permission') THEN
    RAISE EXCEPTION 'Vínculo não encontrado ou já realocado';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.get_diversos_deletion_links(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reallocate_diversos_link(text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_diversos_deletion_links(text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reallocate_diversos_link(text, text, text, text) TO authenticated, service_role;