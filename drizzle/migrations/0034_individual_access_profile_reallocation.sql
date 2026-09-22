CREATE OR REPLACE FUNCTION public.admin_delete_access_profile_individual(
  _source_profile text,
  _reallocations jsonb DEFAULT '[]'::jsonb
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  source_definition public.access_profile_definitions%ROWTYPE;
  item jsonb;
  target_user_id uuid;
  target_profile_code text;
  destination_definition public.access_profile_definitions%ROWTYPE;
  linked_ids uuid[] := '{}';
  supplied_ids uuid[] := '{}';
  moved_count integer := 0;
  resulting_admin_count integer := 0;
BEGIN
  SELECT * INTO source_definition
  FROM public.access_profile_definitions
  WHERE code = _source_profile
  FOR UPDATE;

  IF source_definition.code IS NULL THEN
    RAISE EXCEPTION 'Perfil de origem não encontrado.';
  END IF;

  SELECT COALESCE(array_agg(user_id ORDER BY user_id), '{}'), count(*)
  INTO linked_ids, moved_count
  FROM public.user_access_profiles
  WHERE profile_definition_id = _source_profile;

  IF moved_count > 0 THEN
    IF jsonb_typeof(COALESCE(_reallocations, '[]'::jsonb)) <> 'array'
      OR jsonb_array_length(COALESCE(_reallocations, '[]'::jsonb)) <> moved_count THEN
      RAISE EXCEPTION 'Escolha o novo perfil de cada usuário vinculado.';
    END IF;

    SELECT COALESCE(array_agg((entry->>'user_id')::uuid ORDER BY (entry->>'user_id')::uuid), '{}')
    INTO supplied_ids
    FROM jsonb_array_elements(_reallocations) AS entry;

    IF supplied_ids IS DISTINCT FROM linked_ids
      OR (SELECT count(DISTINCT entry->>'user_id') FROM jsonb_array_elements(_reallocations) AS entry) <> moved_count THEN
      RAISE EXCEPTION 'A lista de usuários para realocação é inválida ou incompleta.';
    END IF;

    FOR item IN SELECT value FROM jsonb_array_elements(_reallocations)
    LOOP
      target_user_id := (item->>'user_id')::uuid;
      target_profile_code := item->>'destination_profile';

      IF target_profile_code IS NULL OR target_profile_code = '' OR target_profile_code = _source_profile THEN
        RAISE EXCEPTION 'Selecione um perfil de destino diferente para cada usuário.';
      END IF;

      SELECT * INTO destination_definition
      FROM public.access_profile_definitions
      WHERE code = target_profile_code
      FOR UPDATE;

      IF destination_definition.code IS NULL OR NOT destination_definition.active THEN
        RAISE EXCEPTION 'Um dos perfis de destino é inválido ou está inativo.';
      END IF;

      UPDATE public.user_access_profiles
      SET profile_definition_id = destination_definition.code,
          profile = destination_definition.base_profile,
          is_customized = false
      WHERE user_id = target_user_id
        AND profile_definition_id = _source_profile;

      DELETE FROM public.user_menu_permissions WHERE user_id = target_user_id;
      DELETE FROM public.user_request_type_permissions WHERE user_id = target_user_id;

      IF destination_definition.base_profile = 'admin'::public.access_profile THEN
        INSERT INTO public.user_roles (user_id, role)
        VALUES (target_user_id, 'admin'::public.app_role)
        ON CONFLICT (user_id, role) DO NOTHING;
      ELSE
        DELETE FROM public.user_roles
        WHERE user_id = target_user_id AND role = 'admin'::public.app_role;
      END IF;
    END LOOP;

    SELECT count(*) INTO resulting_admin_count
    FROM public.user_access_profiles access
    JOIN public.profiles profile ON profile.id = access.user_id
    WHERE access.profile = 'admin'::public.access_profile
      AND profile.deleted_at IS NULL;

    IF resulting_admin_count > 2 THEN
      RAISE EXCEPTION 'A realocação ultrapassaria o limite de dois usuários Admin.';
    END IF;
  ELSIF jsonb_array_length(COALESCE(_reallocations, '[]'::jsonb)) > 0 THEN
    RAISE EXCEPTION 'Este perfil não possui usuários para realocação.';
  END IF;

  DELETE FROM public.access_profile_definitions WHERE code = _source_profile;
  RETURN moved_count;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_delete_access_profile_individual(text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_access_profile_individual(text, jsonb) TO service_role;