CREATE OR REPLACE FUNCTION public.admin_delete_request_type(_code text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Somente usuários Admin podem excluir tipos de solicitação.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.request_types WHERE code = _code) THEN
    RAISE EXCEPTION 'Tipo de solicitação não encontrado.';
  END IF;

  IF EXISTS (SELECT 1 FROM public.purchase_orders WHERE request_type = _code)
     OR EXISTS (SELECT 1 FROM public.approval_rules WHERE _code = ANY(request_types)) THEN
    RAISE EXCEPTION 'Este tipo ainda possui vínculos. Realoque-os antes de excluir.';
  END IF;

  DELETE FROM public.access_profile_request_types WHERE request_type_code = _code;
  DELETE FROM public.user_request_type_permissions WHERE request_type_code = _code;
  DELETE FROM public.request_types WHERE code = _code;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_delete_request_type(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_delete_request_type(text) TO authenticated, service_role;