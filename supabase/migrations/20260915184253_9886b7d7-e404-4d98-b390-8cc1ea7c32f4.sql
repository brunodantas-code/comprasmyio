DROP FUNCTION public.get_factory_access_users();

CREATE POLICY "Authenticated users read factory access members"
ON public.user_access_profiles
FOR SELECT
TO authenticated
USING (profile_definition_id = 'fabrica');

REVOKE ALL ON FUNCTION public.validate_assembly_release_responsibles() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.validate_assembly_release_responsibles() FROM anon;
REVOKE ALL ON FUNCTION public.validate_assembly_release_responsibles() FROM authenticated;