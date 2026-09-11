CREATE OR REPLACE FUNCTION public.can_manage_limits(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin','ceo','coo','cfo')
  );
$$;

REVOKE ALL ON FUNCTION public.can_manage_limits(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_manage_limits(uuid) TO authenticated, service_role;