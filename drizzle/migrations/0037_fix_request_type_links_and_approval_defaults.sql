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
  ELSIF _registry = 'damage_reason' THEN
    RETURN QUERY
      SELECT 'damaged_item:' || di.id::text, 'Item avariado', di.product, COALESCE(di.source_detail, di.source, 'Registro de avaria')
      FROM public.damaged_items di WHERE di.reason_code = _source_code
      ORDER BY 3;
  ELSE
    RAISE EXCEPTION 'Cadastro inválido';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.get_diversos_deletion_links(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_diversos_deletion_links(text, text) TO authenticated, service_role;

ALTER TABLE public.profiles ALTER COLUMN tier2_limit SET DEFAULT 3000;
ALTER TABLE public.profiles ALTER COLUMN tier3_limit SET DEFAULT 10000;