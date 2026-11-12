-- Only the five selected findings: preserve shared CDE use and Supply/finance catalog consumers.
ALTER POLICY "cde_selected read all" ON public.cde_selected TO authenticated
USING (
  auth.uid() IS NOT NULL AND (
    public.is_erp_admin(auth.uid())
    OR EXISTS (SELECT 1 FROM public.user_app_access a WHERE a.user_id = auth.uid())
    OR public.mytosis_role(auth.uid()) IS NOT NULL
  )
);

ALTER POLICY "cde_models read all" ON public.cde_models TO authenticated
USING (
  auth.uid() IS NOT NULL AND (
    public.is_erp_admin(auth.uid())
    OR EXISTS (SELECT 1 FROM public.user_app_access a WHERE a.user_id = auth.uid())
    OR public.mytosis_role(auth.uid()) IS NOT NULL
  )
);

ALTER POLICY "request_subtypes read" ON public.request_subtypes TO authenticated
USING (
  auth.uid() IS NOT NULL AND (
    public.can_manage_request_subtypes(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.user_app_access a
      WHERE a.user_id = auth.uid() AND a.app_key IN ('supply', 'cash_flow')
    )
  )
);

ALTER POLICY "supply_tags read" ON public.supply_tags TO authenticated
USING (
  auth.uid() IS NOT NULL AND (
    public.can_manage_supply_tags(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.user_app_access a
      WHERE a.user_id = auth.uid() AND a.app_key IN ('supply', 'cash_flow')
    )
  )
);

-- Explicit participant binding supplements the existing To Do RLS.
-- Do not use uploader-only reads: shared task recipients must retain file access.
ALTER POLICY todo_file_read ON storage.objects TO authenticated
USING (
  bucket_id = 'personal-todo-attachments'
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.personal_todos t
    WHERE t.id::text = split_part(objects.name, '/', 1)
      AND (t.owner_id = auth.uid() OR auth.uid() = ANY(t.shared_user_ids))
  )
);
