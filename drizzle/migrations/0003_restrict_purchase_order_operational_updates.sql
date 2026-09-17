CREATE OR REPLACE FUNCTION public.is_supply_member(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.has_role(_user_id, 'comprador'::public.app_role)
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      JOIN public.job_titles jt ON jt.id = p.job_title_id
      WHERE p.id = _user_id
        AND lower(trim(jt.name)) IN ('supply', 'time de supply')
        AND jt.active = true
    )
$$;

REVOKE ALL ON FUNCTION public.is_supply_member(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_supply_member(uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS orders_update_buyer ON public.purchase_orders;
CREATE POLICY orders_update_buyer
ON public.purchase_orders
FOR UPDATE
TO authenticated
USING (public.is_supply_member(auth.uid()) OR public.is_access_admin(auth.uid()))
WITH CHECK (public.is_supply_member(auth.uid()) OR public.is_access_admin(auth.uid()));

DROP POLICY IF EXISTS orders_update_approvers ON public.purchase_orders;
CREATE POLICY orders_update_approvers
ON public.purchase_orders
FOR UPDATE
TO authenticated
USING (public.is_supply_member(auth.uid()) OR public.is_access_admin(auth.uid()))
WITH CHECK (public.is_supply_member(auth.uid()) OR public.is_access_admin(auth.uid()));