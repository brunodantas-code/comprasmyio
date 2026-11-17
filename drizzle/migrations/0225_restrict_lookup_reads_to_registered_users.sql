DROP POLICY IF EXISTS "read statuses" ON public.supply_order_statuses;
CREATE POLICY "read statuses" ON public.supply_order_statuses FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid()));
DROP POLICY IF EXISTS "project types readable" ON public.project_types;
CREATE POLICY "project types readable" ON public.project_types FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid()));