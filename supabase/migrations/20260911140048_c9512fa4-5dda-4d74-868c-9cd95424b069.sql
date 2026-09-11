CREATE OR REPLACE FUNCTION public.enforce_admin_role_matches_access_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role = 'admin' AND NOT EXISTS (
    SELECT 1 FROM public.user_access_profiles
    WHERE user_id = NEW.user_id AND profile = 'admin'
  ) THEN
    RAISE EXCEPTION 'O cargo técnico Admin exige Perfil de acesso Admin.';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.enforce_admin_role_matches_access_profile() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enforce_admin_role_matches_access_profile() TO service_role;

CREATE TRIGGER user_roles_require_admin_access_profile
BEFORE INSERT OR UPDATE OF role ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.enforce_admin_role_matches_access_profile();