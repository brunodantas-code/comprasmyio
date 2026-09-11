DROP POLICY "Users read own access profile" ON public.user_access_profiles;
DROP POLICY "Access admins create profiles" ON public.user_access_profiles;
DROP POLICY "Access admins update profiles" ON public.user_access_profiles;
DROP POLICY "Access admins delete profiles" ON public.user_access_profiles;
DROP POLICY "Users read own menu permissions" ON public.user_menu_permissions;
DROP POLICY "Access admins create menu permissions" ON public.user_menu_permissions;
DROP POLICY "Access admins update menu permissions" ON public.user_menu_permissions;
DROP POLICY "Access admins delete menu permissions" ON public.user_menu_permissions;

CREATE POLICY "Users read own access profile"
ON public.user_access_profiles FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Access admins create profiles"
ON public.user_access_profiles FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Access admins update profiles"
ON public.user_access_profiles FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Access admins delete profiles"
ON public.user_access_profiles FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users read own menu permissions"
ON public.user_menu_permissions FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Access admins create menu permissions"
ON public.user_menu_permissions FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Access admins update menu permissions"
ON public.user_menu_permissions FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Access admins delete menu permissions"
ON public.user_menu_permissions FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

REVOKE EXECUTE ON FUNCTION public.is_access_admin(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_new_user_access_profile() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_access_admin(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.sync_new_user_access_profile() TO service_role;