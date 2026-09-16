DROP POLICY IF EXISTS "cost_centers_insert" ON public.cost_centers;
DROP POLICY IF EXISTS "cost_centers_update" ON public.cost_centers;
DROP POLICY IF EXISTS "cost_centers_delete" ON public.cost_centers;

CREATE POLICY "Authorized managers create cost centers"
ON public.cost_centers FOR INSERT TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND public.can_manage_limits(auth.uid())
);

CREATE POLICY "Authorized managers update cost centers"
ON public.cost_centers FOR UPDATE TO authenticated
USING (public.can_manage_limits(auth.uid()))
WITH CHECK (public.can_manage_limits(auth.uid()));

CREATE POLICY "Authorized managers delete cost centers"
ON public.cost_centers FOR DELETE TO authenticated
USING (public.can_manage_limits(auth.uid()));

DROP POLICY IF EXISTS "auth insert purchase_demands" ON public.purchase_demands;
DROP POLICY IF EXISTS "auth update purchase_demands" ON public.purchase_demands;
DROP POLICY IF EXISTS "auth delete purchase_demands" ON public.purchase_demands;

CREATE POLICY "Creators and purchasing team create purchase demands"
ON public.purchase_demands FOR INSERT TO authenticated
WITH CHECK (
  created_by = auth.uid()
  OR public.has_role(auth.uid(), 'comprador'::public.app_role)
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);

CREATE POLICY "Creators and purchasing team update purchase demands"
ON public.purchase_demands FOR UPDATE TO authenticated
USING (
  created_by = auth.uid()
  OR public.has_role(auth.uid(), 'comprador'::public.app_role)
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
)
WITH CHECK (
  created_by = auth.uid()
  OR public.has_role(auth.uid(), 'comprador'::public.app_role)
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);

CREATE POLICY "Creators and purchasing team delete purchase demands"
ON public.purchase_demands FOR DELETE TO authenticated
USING (
  created_by = auth.uid()
  OR public.has_role(auth.uid(), 'comprador'::public.app_role)
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);

DROP POLICY IF EXISTS "auth insert production_demands" ON public.production_demands;
DROP POLICY IF EXISTS "auth update production_demands" ON public.production_demands;
DROP POLICY IF EXISTS "auth delete production_demands" ON public.production_demands;

CREATE POLICY "Creators and factory team create production demands"
ON public.production_demands FOR INSERT TO authenticated
WITH CHECK (
  created_by = auth.uid()
  OR public.has_role(auth.uid(), 'fabrica'::public.app_role)
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);

CREATE POLICY "Creators and factory team update production demands"
ON public.production_demands FOR UPDATE TO authenticated
USING (
  created_by = auth.uid()
  OR public.has_role(auth.uid(), 'fabrica'::public.app_role)
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
)
WITH CHECK (
  created_by = auth.uid()
  OR public.has_role(auth.uid(), 'fabrica'::public.app_role)
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);

CREATE POLICY "Creators and factory team delete production demands"
ON public.production_demands FOR DELETE TO authenticated
USING (
  created_by = auth.uid()
  OR public.has_role(auth.uid(), 'fabrica'::public.app_role)
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);