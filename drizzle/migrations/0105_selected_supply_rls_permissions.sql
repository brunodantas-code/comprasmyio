CREATE OR REPLACE FUNCTION public.security_supply_menu_access(_keys text[])
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.user_access_profiles uap
    LEFT JOIN public.access_profile_definitions def ON def.code = uap.profile_definition_id
    WHERE uap.user_id = auth.uid()
      AND (
        COALESCE(def.base_profile, uap.profile) = 'admin'
        OR (uap.is_customized AND EXISTS (
          SELECT 1 FROM public.user_menu_permissions p
          WHERE p.user_id = auth.uid() AND p.allowed AND p.menu_key = ANY(_keys)
        ))
        OR (NOT uap.is_customized AND EXISTS (
          SELECT 1 FROM public.access_profile_permissions p
          WHERE p.profile_code = uap.profile_definition_id AND p.allowed AND p.menu_key = ANY(_keys)
        ))
      )
  );
$$;
REVOKE ALL ON FUNCTION public.security_supply_menu_access(text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.security_supply_menu_access(text[]) TO authenticated, service_role;

ALTER POLICY damaged_items_select_auth ON public.damaged_items
USING (public.security_supply_menu_access(ARRAY['armazem_itens_avariados']));
ALTER POLICY damaged_items_update_auth ON public.damaged_items
USING (public.security_supply_menu_access(ARRAY['armazem_itens_avariados']))
WITH CHECK (public.security_supply_menu_access(ARRAY['armazem_itens_avariados']));

ALTER POLICY "Authenticated can view unit products" ON public.unit_products
USING (public.security_supply_menu_access(ARRAY['armazem_cliente','armazem_transporte','armazem_expedicao','armazem_estoque_myio','armazem_tecnico','armazem_itens_avariados','armazem_checar_qr']));
ALTER POLICY "Authenticated can insert unit products" ON public.unit_products
WITH CHECK (created_by = auth.uid() AND public.security_supply_menu_access(ARRAY['armazem_cliente','armazem_transporte','armazem_expedicao','armazem_itens_avariados']));
ALTER POLICY "Authenticated can update unit products" ON public.unit_products
USING (public.security_supply_menu_access(ARRAY['armazem_cliente','armazem_transporte','armazem_expedicao','armazem_itens_avariados']))
WITH CHECK (public.security_supply_menu_access(ARRAY['armazem_cliente','armazem_transporte','armazem_expedicao','armazem_itens_avariados']));

ALTER POLICY assembly_release_items_select_auth ON public.assembly_release_items
USING (public.security_supply_menu_access(ARRAY['armazem_fabrica','armazem_homologacao','armazem_estoque_myio','armazem_checar_qr']));
ALTER POLICY release_items_update_auth ON public.assembly_release_items
USING (public.security_supply_menu_access(ARRAY['armazem_fabrica']))
WITH CHECK (public.security_supply_menu_access(ARRAY['armazem_fabrica']));

ALTER POLICY issues_select_auth ON public.assembly_release_issues
USING (public.security_supply_menu_access(ARRAY['armazem_fabrica','armazem_homologacao','armazem_estoque_myio','armazem_checar_qr']));
ALTER POLICY issues_update_auth ON public.assembly_release_issues
USING (public.security_supply_menu_access(ARRAY['armazem_fabrica']))
WITH CHECK (public.security_supply_menu_access(ARRAY['armazem_fabrica']));

ALTER POLICY "Site Survey authenticated users can read material decisions" ON public.site_survey_material_decisions
USING (public.can_view_site_survey_visit(visit_id, auth.uid()));
ALTER POLICY "Site Survey authenticated users can delete material decisions" ON public.site_survey_material_decisions
USING (public.can_view_site_survey_visit(visit_id, auth.uid()) AND (public.has_site_survey_permission(auth.uid(), 'site_survey_executar') OR public.has_site_survey_permission(auth.uid(), 'site_survey_editar')));
ALTER POLICY "Site Survey authenticated users can update material decisions" ON public.site_survey_material_decisions
USING (public.can_view_site_survey_visit(visit_id, auth.uid()) AND (public.has_site_survey_permission(auth.uid(), 'site_survey_executar') OR public.has_site_survey_permission(auth.uid(), 'site_survey_editar')))
WITH CHECK (recorded_by = auth.uid() AND public.can_view_site_survey_visit(visit_id, auth.uid()) AND (public.has_site_survey_permission(auth.uid(), 'site_survey_executar') OR public.has_site_survey_permission(auth.uid(), 'site_survey_editar')));

ALTER POLICY myio_delivery_qrs_insert ON public.myio_delivery_qrs
WITH CHECK (created_by = auth.uid());