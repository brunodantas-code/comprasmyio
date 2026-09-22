CREATE OR REPLACE FUNCTION public.validate_access_profile_definition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.is_system THEN
      RAISE EXCEPTION 'Novos perfis não podem ser identificados como perfis originais.';
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  IF OLD.is_system AND (
    NEW.code IS DISTINCT FROM OLD.code
    OR NEW.base_profile IS DISTINCT FROM OLD.base_profile
    OR NEW.is_system IS DISTINCT FROM OLD.is_system
  ) THEN
    RAISE EXCEPTION 'O código e o modelo dos perfis originais não podem ser alterados.';
  END IF;

  IF NEW.base_profile IS DISTINCT FROM OLD.base_profile AND EXISTS (
    SELECT 1 FROM public.user_access_profiles WHERE profile_definition_id = OLD.code
  ) THEN
    RAISE EXCEPTION 'Este perfil possui usuários vinculados. Realoque-os antes de alterar o modelo base.';
  END IF;

  IF NOT NEW.active AND EXISTS (
    SELECT 1 FROM public.user_access_profiles WHERE profile_definition_id = NEW.code
  ) THEN
    RAISE EXCEPTION 'Este perfil possui usuários vinculados e não pode ser desativado.';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.validate_access_profile_definition() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.validate_access_profile_definition() TO service_role;

CREATE OR REPLACE FUNCTION public.admin_delete_access_profile(
  _source_profile text,
  _destination_profile text DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  source_definition public.access_profile_definitions%ROWTYPE;
  destination_definition public.access_profile_definitions%ROWTYPE;
  moved_ids uuid[] := '{}';
  moved_count integer := 0;
  other_admin_count integer := 0;
BEGIN
  SELECT * INTO source_definition
  FROM public.access_profile_definitions
  WHERE code = _source_profile
  FOR UPDATE;

  IF source_definition.code IS NULL THEN
    RAISE EXCEPTION 'Perfil de origem não encontrado.';
  END IF;

  SELECT COALESCE(array_agg(user_id), '{}'), count(*)
    INTO moved_ids, moved_count
  FROM public.user_access_profiles
  WHERE profile_definition_id = _source_profile;

  IF moved_count > 0 THEN
    IF _destination_profile IS NULL OR _destination_profile = '' THEN
      RAISE EXCEPTION 'Selecione o novo perfil dos usuários vinculados.';
    END IF;
    IF _destination_profile = _source_profile THEN
      RAISE EXCEPTION 'Selecione um perfil de destino diferente.';
    END IF;

    SELECT * INTO destination_definition
    FROM public.access_profile_definitions
    WHERE code = _destination_profile
    FOR UPDATE;

    IF destination_definition.code IS NULL OR NOT destination_definition.active THEN
      RAISE EXCEPTION 'O perfil de destino é inválido ou está inativo.';
    END IF;

    IF destination_definition.base_profile = 'admin'::public.access_profile THEN
      SELECT count(*) INTO other_admin_count
      FROM public.user_access_profiles access
      JOIN public.profiles profile ON profile.id = access.user_id
      WHERE access.profile = 'admin'::public.access_profile
        AND profile.deleted_at IS NULL
        AND NOT (access.user_id = ANY(moved_ids));
      IF other_admin_count + moved_count > 2 THEN
        RAISE EXCEPTION 'A realocação ultrapassaria o limite de dois usuários Admin.';
      END IF;
    END IF;

    UPDATE public.user_access_profiles
    SET profile_definition_id = destination_definition.code,
        profile = destination_definition.base_profile,
        is_customized = false
    WHERE profile_definition_id = _source_profile;

    DELETE FROM public.user_menu_permissions WHERE user_id = ANY(moved_ids);
    DELETE FROM public.user_request_type_permissions WHERE user_id = ANY(moved_ids);

    IF destination_definition.base_profile = 'admin'::public.access_profile THEN
      INSERT INTO public.user_roles (user_id, role)
      SELECT user_id, 'admin'::public.app_role FROM unnest(moved_ids) AS user_id
      ON CONFLICT (user_id, role) DO NOTHING;
    ELSE
      DELETE FROM public.user_roles
      WHERE role = 'admin'::public.app_role AND user_id = ANY(moved_ids);
    END IF;
  END IF;

  DELETE FROM public.access_profile_definitions WHERE code = _source_profile;
  RETURN moved_count;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_delete_access_profile(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_access_profile(text, text) TO service_role;