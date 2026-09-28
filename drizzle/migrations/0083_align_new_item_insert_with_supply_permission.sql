CREATE OR REPLACE FUNCTION public.can_create_supply_new_item(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_access_profiles uap
    LEFT JOIN public.access_profile_definitions apd ON apd.code = uap.profile_definition_id
    WHERE uap.user_id = _user_id
      AND (
        apd.base_profile = 'admin'
        OR public.is_access_admin(_user_id)
        OR (NOT uap.is_customized AND public.is_supply_member(_user_id))
        OR (uap.is_customized AND EXISTS (
          SELECT 1 FROM public.user_menu_permissions ump
          WHERE ump.user_id = _user_id
            AND ump.menu_key = 'solicitacoes_item_novo'
            AND ump.allowed = true
        ))
        OR (NOT uap.is_customized AND EXISTS (
          SELECT 1 FROM public.access_profile_permissions app
          WHERE app.profile_code = uap.profile_definition_id
            AND app.menu_key = 'solicitacoes_item_novo'
            AND app.allowed = true
        ))
      )
  );
$$;
REVOKE ALL ON FUNCTION public.can_create_supply_new_item(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_create_supply_new_item(uuid) TO authenticated, service_role;

ALTER POLICY "Admins and Supply can insert materials" ON public.materials
  WITH CHECK (created_by = auth.uid() AND public.can_create_supply_new_item(auth.uid()));
ALTER POLICY "Admins and Supply can insert terceiros materials" ON public.terceiros_materials
  WITH CHECK (created_by = auth.uid() AND public.can_create_supply_new_item(auth.uid()));
ALTER POLICY "Admins and Supply can insert tool assets" ON public.tool_assets
  WITH CHECK (created_by = auth.uid() AND public.can_create_supply_new_item(auth.uid()));