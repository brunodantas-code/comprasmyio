CREATE OR REPLACE FUNCTION public.sync_new_user_access_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  default_definition public.access_profile_definitions%ROWTYPE;
BEGIN
  SELECT * INTO default_definition
  FROM public.access_profile_definitions
  WHERE active
  ORDER BY
    CASE WHEN code = 'restrito' THEN 0 WHEN base_profile = 'restrito'::public.access_profile THEN 1 WHEN base_profile = 'padrao'::public.access_profile THEN 2 ELSE 3 END,
    created_at
  LIMIT 1;

  IF default_definition.code IS NULL THEN
    RAISE EXCEPTION 'Cadastre ao menos um Perfil de Acesso ativo antes de adicionar usuários.';
  END IF;

  INSERT INTO public.user_access_profiles (user_id, profile, profile_definition_id, is_customized)
  VALUES (NEW.id, default_definition.base_profile, default_definition.code, true)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.sync_new_user_access_profile() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_new_user_access_profile() TO service_role;