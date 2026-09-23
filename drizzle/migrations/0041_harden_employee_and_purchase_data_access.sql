DROP POLICY IF EXISTS profiles_select_all_auth ON public.profiles;
CREATE POLICY profiles_select_relevant_users
ON public.profiles
FOR SELECT
TO authenticated
USING (
  id = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.is_supply_member(auth.uid())
  OR manager_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.approval_steps step
    JOIN public.purchase_orders order_row ON order_row.id = step.order_id
    WHERE step.approver_id = auth.uid()
      AND order_row.requester_id = profiles.id
  )
);

DROP POLICY IF EXISTS purchase_order_items_select_via_order ON public.purchase_order_items;
CREATE POLICY purchase_order_items_select_via_authorized_order
ON public.purchase_order_items
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.purchase_orders order_row
    WHERE order_row.id = purchase_order_items.order_id
      AND (
        order_row.requester_id = auth.uid()
        OR public.is_access_admin(auth.uid())
        OR public.can_manage_limits(auth.uid())
        OR order_row.approval_status = 'aprovado'
      )
  )
);

DROP POLICY IF EXISTS user_additional_job_titles_admin_insert ON public.user_additional_job_titles;
CREATE POLICY user_additional_job_titles_admin_insert
ON public.user_additional_job_titles
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_access_admin(auth.uid())
  AND NOT EXISTS (
    SELECT 1
    FROM public.profiles profile_row
    WHERE profile_row.id = user_additional_job_titles.user_id
      AND profile_row.job_title_id = user_additional_job_titles.job_title_id
  )
  AND EXISTS (
    SELECT 1
    FROM public.job_titles title_row
    WHERE title_row.id = user_additional_job_titles.job_title_id
      AND title_row.active
  )
);

DROP POLICY IF EXISTS user_additional_job_titles_admin_update ON public.user_additional_job_titles;
CREATE POLICY user_additional_job_titles_admin_update
ON public.user_additional_job_titles
FOR UPDATE
TO authenticated
USING (public.is_access_admin(auth.uid()))
WITH CHECK (
  public.is_access_admin(auth.uid())
  AND NOT EXISTS (
    SELECT 1
    FROM public.profiles profile_row
    WHERE profile_row.id = user_additional_job_titles.user_id
      AND profile_row.job_title_id = user_additional_job_titles.job_title_id
  )
  AND EXISTS (
    SELECT 1
    FROM public.job_titles title_row
    WHERE title_row.id = user_additional_job_titles.job_title_id
      AND title_row.active
  )
);

DROP POLICY IF EXISTS "Authenticated users read factory access members" ON public.user_access_profiles;
CREATE POLICY "Relevant staff read factory access members"
ON public.user_access_profiles
FOR SELECT
TO authenticated
USING (
  profile_definition_id = 'fabrica'
  AND (
    user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.is_supply_member(auth.uid())
  )
);

REVOKE EXECUTE ON FUNCTION public.convert_client_to_unit(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.ensure_single_default_delivery_point() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_project_deletion_links(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_job_title(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_supply_member(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.reallocate_allocation_link(text, text, uuid, text, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.validate_client_unit_assignment() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_purchase_order_active_project() FROM PUBLIC, anon, authenticated;