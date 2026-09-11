DROP POLICY IF EXISTS job_title_hierarchy_manage ON public.job_title_hierarchy;

CREATE POLICY job_title_hierarchy_manage
ON public.job_title_hierarchy
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));
