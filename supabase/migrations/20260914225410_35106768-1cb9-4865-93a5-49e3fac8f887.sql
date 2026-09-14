CREATE TABLE public.access_profile_definitions (
  code text PRIMARY KEY,
  name text NOT NULL,
  base_profile public.access_profile NOT NULL,
  active boolean NOT NULL DEFAULT true,
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.access_profile_definitions TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.access_profile_definitions TO authenticated;
GRANT ALL ON public.access_profile_definitions TO service_role;
ALTER TABLE public.access_profile_definitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users view access profile definitions"
ON public.access_profile_definitions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins create access profile definitions"
ON public.access_profile_definitions FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update access profile definitions"
ON public.access_profile_definitions FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete access profile definitions"
ON public.access_profile_definitions FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE UNIQUE INDEX access_profile_definitions_name_unique
ON public.access_profile_definitions (lower(btrim(name)));

CREATE TRIGGER access_profile_definitions_set_updated_at
BEFORE UPDATE ON public.access_profile_definitions
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.access_profile_definitions (code, name, base_profile, active, is_system)
VALUES
  ('admin', 'Admin', 'admin', true, true),
  ('padrao', 'Padrão', 'padrao', true, true),
  ('restrito', 'Restrito', 'restrito', true, true);

ALTER TABLE public.user_access_profiles
ADD COLUMN profile_definition_id text REFERENCES public.access_profile_definitions(code) ON UPDATE CASCADE ON DELETE RESTRICT;

UPDATE public.user_access_profiles
SET profile_definition_id = profile::text;

ALTER TABLE public.user_access_profiles
ALTER COLUMN profile_definition_id SET DEFAULT 'restrito',
ALTER COLUMN profile_definition_id SET NOT NULL;

CREATE OR REPLACE FUNCTION public.validate_access_profile_definition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.is_system THEN
      RAISE EXCEPTION 'Os perfis originais não podem ser excluídos.';
    END IF;
    RETURN OLD;
  END IF;

  IF NEW.is_system AND TG_OP = 'UPDATE' THEN
    IF NEW.code IS DISTINCT FROM OLD.code OR NEW.base_profile IS DISTINCT FROM OLD.base_profile OR NEW.is_system IS DISTINCT FROM OLD.is_system THEN
      RAISE EXCEPTION 'O código e o modelo dos perfis originais não podem ser alterados.';
    END IF;
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

CREATE TRIGGER access_profile_definitions_validate
BEFORE UPDATE OR DELETE ON public.access_profile_definitions
FOR EACH ROW EXECUTE FUNCTION public.validate_access_profile_definition();

CREATE OR REPLACE FUNCTION public.sync_access_profile_base()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  definition_base public.access_profile;
  definition_active boolean;
BEGIN
  SELECT base_profile, active INTO definition_base, definition_active
  FROM public.access_profile_definitions
  WHERE code = NEW.profile_definition_id;

  IF definition_base IS NULL THEN
    RAISE EXCEPTION 'Perfil de acesso não encontrado.';
  END IF;
  IF NOT definition_active THEN
    RAISE EXCEPTION 'Este perfil de acesso está inativo.';
  END IF;
  NEW.profile := definition_base;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.sync_access_profile_base() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_access_profile_base() TO service_role;

CREATE TRIGGER access_profile_assignment_sync_base
BEFORE INSERT OR UPDATE OF profile_definition_id ON public.user_access_profiles
FOR EACH ROW EXECUTE FUNCTION public.sync_access_profile_base();

CREATE OR REPLACE FUNCTION public.sync_new_user_access_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_access_profiles (user_id, profile, profile_definition_id)
  VALUES (NEW.id, 'restrito'::public.access_profile, 'restrito')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.sync_new_user_access_profile() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_new_user_access_profile() TO service_role;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_first boolean;
BEGIN
  SELECT NOT EXISTS (SELECT 1 FROM public.user_roles) INTO is_first;
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), NEW.email);
  IF is_first THEN
    UPDATE public.user_access_profiles
       SET profile_definition_id = 'admin'
     WHERE user_id = NEW.id;
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;