REVOKE EXECUTE ON FUNCTION public.enforce_max_two_access_admins() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_user_access_profile(uuid, public.access_profile) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.request_user_deletion(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.decide_user_deletion(uuid, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enforce_max_two_access_admins() TO service_role;
GRANT EXECUTE ON FUNCTION public.set_user_access_profile(uuid, public.access_profile) TO service_role;
GRANT EXECUTE ON FUNCTION public.request_user_deletion(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.decide_user_deletion(uuid, boolean) TO service_role;