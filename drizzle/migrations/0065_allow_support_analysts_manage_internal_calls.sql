CREATE OR REPLACE FUNCTION public.is_customer_support_analyst(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.job_titles jt ON jt.id = p.job_title_id
    WHERE p.id = _user_id
      AND p.deleted_at IS NULL
      AND jt.active
      AND lower(jt.name) = lower('Analista de Suporte ao Cliente')
  ) OR EXISTS (
    SELECT 1
    FROM public.user_additional_job_titles uajt
    JOIN public.profiles p ON p.id = uajt.user_id
    JOIN public.job_titles jt ON jt.id = uajt.job_title_id
    WHERE uajt.user_id = _user_id
      AND p.deleted_at IS NULL
      AND jt.active
      AND lower(jt.name) = lower('Analista de Suporte ao Cliente')
  );
$$;

REVOKE ALL ON FUNCTION public.is_customer_support_analyst(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_customer_support_analyst(uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "Users can view related internal calls" ON public.internal_calls;
CREATE POLICY "Users can view related internal calls"
ON public.internal_calls
FOR SELECT
TO authenticated
USING (
  reporter_id = auth.uid()
  OR assignee_id = auth.uid()
  OR public.is_erp_admin(auth.uid())
  OR public.is_customer_support_analyst(auth.uid())
);

DROP POLICY IF EXISTS "Related users can update internal calls" ON public.internal_calls;
CREATE POLICY "Related users can update internal calls"
ON public.internal_calls
FOR UPDATE
TO authenticated
USING (
  reporter_id = auth.uid()
  OR assignee_id = auth.uid()
  OR public.is_erp_admin(auth.uid())
  OR public.is_customer_support_analyst(auth.uid())
)
WITH CHECK (
  reporter_id = auth.uid()
  OR assignee_id = auth.uid()
  OR public.is_erp_admin(auth.uid())
  OR public.is_customer_support_analyst(auth.uid())
);

DROP POLICY IF EXISTS "Related users can view internal call logs" ON public.internal_call_logs;
CREATE POLICY "Related users can view internal call logs"
ON public.internal_call_logs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.internal_calls c
    WHERE c.id = internal_call_logs.call_id
      AND (
        c.reporter_id = auth.uid()
        OR c.assignee_id = auth.uid()
        OR public.is_erp_admin(auth.uid())
        OR public.is_customer_support_analyst(auth.uid())
      )
  )
);

DROP POLICY IF EXISTS "Related users can view internal call messages" ON public.internal_call_messages;
CREATE POLICY "Related users can view internal call messages"
ON public.internal_call_messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.internal_calls c
    WHERE c.id = internal_call_messages.call_id
      AND (
        c.reporter_id = auth.uid()
        OR c.assignee_id = auth.uid()
        OR public.is_erp_admin(auth.uid())
        OR public.is_customer_support_analyst(auth.uid())
      )
  )
);

DROP POLICY IF EXISTS "Related users can write internal call messages" ON public.internal_call_messages;
CREATE POLICY "Related users can write internal call messages"
ON public.internal_call_messages
FOR INSERT
TO authenticated
WITH CHECK (
  author_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.internal_calls c
    WHERE c.id = internal_call_messages.call_id
      AND (
        c.reporter_id = auth.uid()
        OR c.assignee_id = auth.uid()
        OR public.is_erp_admin(auth.uid())
        OR public.is_customer_support_analyst(auth.uid())
      )
  )
);

DROP POLICY IF EXISTS "Related users can view internal call attachments" ON public.internal_call_attachments;
CREATE POLICY "Related users can view internal call attachments"
ON public.internal_call_attachments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.internal_calls c
    WHERE c.id = internal_call_attachments.call_id
      AND (
        c.reporter_id = auth.uid()
        OR c.assignee_id = auth.uid()
        OR public.is_erp_admin(auth.uid())
        OR public.is_customer_support_analyst(auth.uid())
      )
  )
);

DROP POLICY IF EXISTS "Related users can add internal call attachments" ON public.internal_call_attachments;
CREATE POLICY "Related users can add internal call attachments"
ON public.internal_call_attachments
FOR INSERT
TO authenticated
WITH CHECK (
  uploaded_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.internal_calls c
    WHERE c.id = internal_call_attachments.call_id
      AND (
        c.reporter_id = auth.uid()
        OR c.assignee_id = auth.uid()
        OR public.is_erp_admin(auth.uid())
        OR public.is_customer_support_analyst(auth.uid())
      )
  )
);