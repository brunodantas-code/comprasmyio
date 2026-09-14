CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.is_erp_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.erp_admins WHERE user_id = _user_id
  );
$$;

CREATE OR REPLACE FUNCTION private.has_app_access(_user_id uuid, _app_key text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_app_access
    WHERE user_id = _user_id AND app_key = _app_key
  );
$$;

REVOKE ALL ON FUNCTION private.is_erp_admin(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.has_app_access(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.is_erp_admin(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.has_app_access(uuid, text) TO authenticated, service_role;

ALTER POLICY "Authenticated users can view active ERP apps" ON public.erp_apps
USING (active OR private.is_erp_admin(auth.uid()));
ALTER POLICY "Users can view their ERP admin status" ON public.erp_admins
USING (user_id = auth.uid() OR private.is_erp_admin(auth.uid()));
ALTER POLICY "ERP admins can add ERP admins" ON public.erp_admins
WITH CHECK (private.is_erp_admin(auth.uid()));
ALTER POLICY "ERP admins can remove ERP admins" ON public.erp_admins
USING (private.is_erp_admin(auth.uid()));
ALTER POLICY "Users can view own app access" ON public.user_app_access
USING (user_id = auth.uid() OR private.is_erp_admin(auth.uid()));
ALTER POLICY "ERP admins can grant app access" ON public.user_app_access
WITH CHECK (private.is_erp_admin(auth.uid()));
ALTER POLICY "ERP admins can update app access" ON public.user_app_access
USING (private.is_erp_admin(auth.uid()))
WITH CHECK (private.is_erp_admin(auth.uid()));
ALTER POLICY "ERP admins can revoke app access" ON public.user_app_access
USING (private.is_erp_admin(auth.uid()));

DROP FUNCTION public.is_erp_admin(uuid);
DROP FUNCTION public.has_app_access(uuid, text);