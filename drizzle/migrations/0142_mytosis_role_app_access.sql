CREATE OR REPLACE FUNCTION public.mytosis_role(_user_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN public.is_erp_admin(_user_id) THEN 'admin'
    ELSE coalesce(
      (SELECT role FROM public.mytosis_members WHERE user_id = _user_id),
      (SELECT 'viewer' FROM public.user_app_access WHERE user_id = _user_id AND app_key = 'mytosis')
    )
  END
$$;