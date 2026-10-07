ALTER POLICY damaged_items_select_auth ON public.damaged_items USING (true);
ALTER POLICY "Authenticated can view unit products" ON public.unit_products USING (true);
ALTER POLICY "Authenticated can insert unit products" ON public.unit_products WITH CHECK (true);
ALTER POLICY assembly_release_items_select_auth ON public.assembly_release_items USING (true);
ALTER POLICY issues_select_auth ON public.assembly_release_issues USING (true);
ALTER POLICY "Site Survey authenticated users can read material decisions" ON public.site_survey_material_decisions USING (true);
ALTER POLICY "Site Survey authenticated users can update material decisions" ON public.site_survey_material_decisions USING (true) WITH CHECK (true);