DROP POLICY IF EXISTS orders_select_own_or_buyer_admin ON public.purchase_orders;
CREATE POLICY orders_select_own_or_buyer_admin
ON public.purchase_orders
FOR SELECT
TO authenticated
USING (
  requester_id = auth.uid()
  OR public.is_access_admin(auth.uid())
  OR public.can_manage_limits(auth.uid())
  OR (public.is_supply_member(auth.uid()) AND approval_status = 'aprovado')
);