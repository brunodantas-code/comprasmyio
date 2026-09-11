CREATE TYPE public.access_profile AS ENUM ('admin', 'padrao', 'restrito');

CREATE TABLE public.user_access_profiles (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  profile public.access_profile NOT NULL DEFAULT 'padrao',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_access_profiles TO authenticated;
GRANT ALL ON public.user_access_profiles TO service_role;
ALTER TABLE public.user_access_profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_menu_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  menu_key text NOT NULL CHECK (menu_key IN ('solicitacoes', 'approvals', 'armazem')),
  allowed boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, menu_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_menu_permissions TO authenticated;
GRANT ALL ON public.user_menu_permissions TO service_role;
ALTER TABLE public.user_menu_permissions ENABLE ROW LEVEL SECURITY;

INSERT INTO public.user_access_profiles (user_id, profile)
SELECT p.id,
       CASE WHEN EXISTS (
         SELECT 1 FROM public.user_roles ur
         WHERE ur.user_id = p.id AND ur.role = 'admin'
       ) THEN 'admin'::public.access_profile ELSE 'padrao'::public.access_profile END
FROM public.profiles p
ON CONFLICT (user_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.is_access_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_access_profiles
    WHERE user_id = _user_id AND profile = 'admin'
  )
$$;
REVOKE ALL ON FUNCTION public.is_access_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_access_admin(uuid) TO authenticated, service_role;

CREATE POLICY "Users read own access profile"
ON public.user_access_profiles FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_access_admin(auth.uid()));
CREATE POLICY "Access admins create profiles"
ON public.user_access_profiles FOR INSERT TO authenticated
WITH CHECK (public.is_access_admin(auth.uid()));
CREATE POLICY "Access admins update profiles"
ON public.user_access_profiles FOR UPDATE TO authenticated
USING (public.is_access_admin(auth.uid()))
WITH CHECK (public.is_access_admin(auth.uid()));
CREATE POLICY "Access admins delete profiles"
ON public.user_access_profiles FOR DELETE TO authenticated
USING (public.is_access_admin(auth.uid()));

CREATE POLICY "Users read own menu permissions"
ON public.user_menu_permissions FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_access_admin(auth.uid()));
CREATE POLICY "Access admins create menu permissions"
ON public.user_menu_permissions FOR INSERT TO authenticated
WITH CHECK (public.is_access_admin(auth.uid()));
CREATE POLICY "Access admins update menu permissions"
ON public.user_menu_permissions FOR UPDATE TO authenticated
USING (public.is_access_admin(auth.uid()))
WITH CHECK (public.is_access_admin(auth.uid()));
CREATE POLICY "Access admins delete menu permissions"
ON public.user_menu_permissions FOR DELETE TO authenticated
USING (public.is_access_admin(auth.uid()));

CREATE TRIGGER user_access_profiles_set_updated_at
BEFORE UPDATE ON public.user_access_profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER user_menu_permissions_set_updated_at
BEFORE UPDATE ON public.user_menu_permissions
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.sync_new_user_access_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_access_profiles (user_id, profile)
  VALUES (NEW.id, CASE WHEN public.has_role(NEW.id, 'admin') THEN 'admin'::public.access_profile ELSE 'padrao'::public.access_profile END)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.sync_new_user_access_profile() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sync_new_user_access_profile() TO service_role;

CREATE TRIGGER profiles_create_access_profile
AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.sync_new_user_access_profile();