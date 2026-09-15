DELETE FROM public.access_profile_permissions AS permission
USING public.access_profile_definitions AS definition
WHERE permission.profile_code = definition.code
  AND definition.base_profile <> 'admin'
  AND (permission.menu_key = 'usuarios' OR permission.menu_key LIKE 'usuarios_%');

DELETE FROM public.user_menu_permissions AS permission
USING public.user_access_profiles AS access
WHERE permission.user_id = access.user_id
  AND access.profile <> 'admin'
  AND (permission.menu_key = 'usuarios' OR permission.menu_key LIKE 'usuarios_%');

CREATE OR REPLACE FUNCTION public.enforce_admin_menu_permission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_base_profile public.access_profile;
BEGIN
  IF NEW.menu_key <> 'usuarios' AND NEW.menu_key NOT LIKE 'usuarios_%' THEN
    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME = 'access_profile_permissions' THEN
    SELECT definition.base_profile
      INTO target_base_profile
      FROM public.access_profile_definitions AS definition
     WHERE definition.code = NEW.profile_code;
  ELSE
    SELECT access.profile
      INTO target_base_profile
      FROM public.user_access_profiles AS access
     WHERE access.user_id = NEW.user_id;
  END IF;

  IF target_base_profile IS DISTINCT FROM 'admin'::public.access_profile THEN
    RAISE EXCEPTION 'Usuários e logs é exclusivo do perfil Admin';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_admin_profile_menu_permission ON public.access_profile_permissions;
CREATE TRIGGER enforce_admin_profile_menu_permission
BEFORE INSERT OR UPDATE ON public.access_profile_permissions
FOR EACH ROW EXECUTE FUNCTION public.enforce_admin_menu_permission();

DROP TRIGGER IF EXISTS enforce_admin_user_menu_permission ON public.user_menu_permissions;
CREATE TRIGGER enforce_admin_user_menu_permission
BEFORE INSERT OR UPDATE ON public.user_menu_permissions
FOR EACH ROW EXECUTE FUNCTION public.enforce_admin_menu_permission();