CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  ) OR (
    _role = 'admin'::public.app_role
    AND EXISTS (
      SELECT 1
      FROM public.user_access_profiles access
      JOIN public.access_profile_definitions definition
        ON definition.code = access.profile_definition_id
      WHERE access.user_id = _user_id
        AND definition.active
        AND definition.base_profile = 'admin'::public.access_profile
    )
  );
$$;

REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.can_manage_limits(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin'::public.app_role);
$$;

REVOKE ALL ON FUNCTION public.can_manage_limits(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_manage_limits(uuid) TO authenticated, service_role;