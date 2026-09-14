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
    IF OLD.is_system THEN
      RAISE EXCEPTION 'Os perfis originais não podem ser excluídos.';
    END IF;
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