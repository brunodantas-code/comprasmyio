DROP POLICY IF EXISTS "Admins can insert materials" ON public.materials;
CREATE POLICY "Admins and Supply can insert materials"
ON public.materials
FOR INSERT
TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND (public.is_access_admin(auth.uid()) OR public.is_supply_member(auth.uid()))
);

DROP POLICY IF EXISTS "Admins can insert terceiros materials" ON public.terceiros_materials;
CREATE POLICY "Admins and Supply can insert terceiros materials"
ON public.terceiros_materials
FOR INSERT
TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND (public.is_access_admin(auth.uid()) OR public.is_supply_member(auth.uid()))
);

DROP POLICY IF EXISTS "Admins can insert tool assets" ON public.tool_assets;
CREATE POLICY "Admins and Supply can insert tool assets"
ON public.tool_assets
FOR INSERT
TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND (public.is_access_admin(auth.uid()) OR public.is_supply_member(auth.uid()))
);