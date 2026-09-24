DROP POLICY IF EXISTS "profiles_select_relevant_users" ON public.profiles;
CREATE POLICY "profiles_select_relevant_users"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  id = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.is_supply_member(auth.uid())
  OR public.is_customer_support_analyst(auth.uid())
  OR manager_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.approval_steps step
    JOIN public.purchase_orders order_row ON order_row.id = step.order_id
    WHERE step.approver_id = auth.uid()
      AND order_row.requester_id = profiles.id
  )
);