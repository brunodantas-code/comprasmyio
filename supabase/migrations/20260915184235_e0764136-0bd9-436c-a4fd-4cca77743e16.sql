CREATE OR REPLACE FUNCTION public.get_factory_access_users()
RETURNS TABLE(id uuid, full_name text, email text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.full_name, p.email
  FROM public.profiles AS p
  JOIN public.user_access_profiles AS access
    ON access.user_id = p.id
  WHERE access.profile_definition_id = 'fabrica'
    AND p.deleted_at IS NULL
  ORDER BY p.full_name NULLS LAST, p.email NULLS LAST;
$$;

REVOKE ALL ON FUNCTION public.get_factory_access_users() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_factory_access_users() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_factory_access_users() TO service_role;

CREATE OR REPLACE FUNCTION public.validate_assembly_release_responsibles()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF cardinality(NEW.responsibles) = 0 THEN
    RAISE EXCEPTION 'Selecione ao menos um responsável pela montagem';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM unnest(NEW.responsibles) AS responsible_id
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.profiles AS p
      JOIN public.user_access_profiles AS access
        ON access.user_id = p.id
      WHERE p.id = responsible_id
        AND p.deleted_at IS NULL
        AND access.profile_definition_id = 'fabrica'
    )
  ) THEN
    RAISE EXCEPTION 'Todos os responsáveis devem possuir o perfil Fábrica';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_assembly_release_responsibles_trigger ON public.assembly_releases;
CREATE TRIGGER validate_assembly_release_responsibles_trigger
BEFORE INSERT OR UPDATE OF responsibles ON public.assembly_releases
FOR EACH ROW
EXECUTE FUNCTION public.validate_assembly_release_responsibles();