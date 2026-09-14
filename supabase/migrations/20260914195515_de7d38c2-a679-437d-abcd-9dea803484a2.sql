REVOKE INSERT, DELETE ON public.request_types FROM authenticated;
DROP POLICY request_types_manage ON public.request_types;
CREATE POLICY request_types_update
ON public.request_types
FOR UPDATE
TO authenticated
USING (public.can_manage_limits(auth.uid()))
WITH CHECK (public.can_manage_limits(auth.uid()));