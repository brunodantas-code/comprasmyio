REVOKE ALL ON FUNCTION public.enforce_admin_menu_permission() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.enforce_admin_menu_permission() FROM anon;
REVOKE ALL ON FUNCTION public.enforce_admin_menu_permission() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.enforce_admin_menu_permission() TO service_role;