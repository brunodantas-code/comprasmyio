REVOKE ALL ON FUNCTION public.can_manage_limits(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_manage_limits(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.set_approval_number() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_approval_number() TO service_role;

REVOKE ALL ON FUNCTION public.set_order_approval_status() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_order_approval_status() TO service_role;