CREATE TABLE public.site_survey_access_profiles (
  code text PRIMARY KEY,
  name text NOT NULL UNIQUE,
  active boolean NOT NULL DEFAULT true,
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_survey_access_profiles TO authenticated;
GRANT ALL ON public.site_survey_access_profiles TO service_role;
ALTER TABLE public.site_survey_access_profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.site_survey_profile_permissions (
  profile_code text NOT NULL REFERENCES public.site_survey_access_profiles(code) ON DELETE CASCADE,
  permission_key text NOT NULL,
  allowed boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (profile_code, permission_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_survey_profile_permissions TO authenticated;
GRANT ALL ON public.site_survey_profile_permissions TO service_role;
ALTER TABLE public.site_survey_profile_permissions ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.site_survey_user_profiles (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  profile_code text NOT NULL REFERENCES public.site_survey_access_profiles(code) ON DELETE RESTRICT DEFAULT 'tecnico',
  is_customized boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_survey_user_profiles TO authenticated;
GRANT ALL ON public.site_survey_user_profiles TO service_role;
ALTER TABLE public.site_survey_user_profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.site_survey_user_permissions (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  permission_key text NOT NULL,
  allowed boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, permission_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_survey_user_permissions TO authenticated;
GRANT ALL ON public.site_survey_user_permissions TO service_role;
ALTER TABLE public.site_survey_user_permissions ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_erp_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.erp_admins WHERE user_id = _user_id) $$;
REVOKE ALL ON FUNCTION public.is_erp_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_erp_admin(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.has_site_survey_permission(_user_id uuid, _permission text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_erp_admin(_user_id) OR EXISTS (
    SELECT 1
    FROM public.user_app_access uaa
    JOIN public.site_survey_user_profiles sup ON sup.user_id = uaa.user_id
    WHERE uaa.user_id = _user_id
      AND uaa.app_key = 'site_survey'
      AND (
        (sup.is_customized AND EXISTS (
          SELECT 1 FROM public.site_survey_user_permissions uperm
          WHERE uperm.user_id = _user_id AND uperm.permission_key = _permission AND uperm.allowed
        ))
        OR
        (NOT sup.is_customized AND EXISTS (
          SELECT 1 FROM public.site_survey_profile_permissions pperm
          WHERE pperm.profile_code = sup.profile_code AND pperm.permission_key = _permission AND pperm.allowed
        ))
      )
  )
$$;

CREATE POLICY "Site Survey profiles are readable by app users" ON public.site_survey_access_profiles FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.user_app_access WHERE user_id = auth.uid() AND app_key = 'site_survey'));
CREATE POLICY "Site Survey profiles are managed by admins" ON public.site_survey_access_profiles FOR ALL TO authenticated USING (public.is_erp_admin(auth.uid()) OR public.has_site_survey_permission(auth.uid(), 'site_survey_perfis')) WITH CHECK (public.is_erp_admin(auth.uid()) OR public.has_site_survey_permission(auth.uid(), 'site_survey_perfis'));
CREATE POLICY "Site Survey profile permissions are readable by app users" ON public.site_survey_profile_permissions FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.user_app_access WHERE user_id = auth.uid() AND app_key = 'site_survey'));
CREATE POLICY "Site Survey profile permissions are managed by admins" ON public.site_survey_profile_permissions FOR ALL TO authenticated USING (public.is_erp_admin(auth.uid()) OR public.has_site_survey_permission(auth.uid(), 'site_survey_perfis')) WITH CHECK (public.is_erp_admin(auth.uid()) OR public.has_site_survey_permission(auth.uid(), 'site_survey_perfis'));
CREATE POLICY "Site Survey user profiles are readable by app users" ON public.site_survey_user_profiles FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.user_app_access WHERE user_id = auth.uid() AND app_key = 'site_survey'));
CREATE POLICY "Site Survey user profiles are managed by admins" ON public.site_survey_user_profiles FOR ALL TO authenticated USING (public.is_erp_admin(auth.uid()) OR public.has_site_survey_permission(auth.uid(), 'site_survey_usuarios') OR public.has_site_survey_permission(auth.uid(), 'site_survey_perfis')) WITH CHECK (public.is_erp_admin(auth.uid()) OR public.has_site_survey_permission(auth.uid(), 'site_survey_usuarios') OR public.has_site_survey_permission(auth.uid(), 'site_survey_perfis'));
CREATE POLICY "Site Survey user permissions are readable by app users" ON public.site_survey_user_permissions FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.user_app_access WHERE user_id = auth.uid() AND app_key = 'site_survey'));
CREATE POLICY "Site Survey user permissions are managed by admins" ON public.site_survey_user_permissions FOR ALL TO authenticated USING (public.is_erp_admin(auth.uid()) OR public.has_site_survey_permission(auth.uid(), 'site_survey_usuarios') OR public.has_site_survey_permission(auth.uid(), 'site_survey_perfis')) WITH CHECK (public.is_erp_admin(auth.uid()) OR public.has_site_survey_permission(auth.uid(), 'site_survey_usuarios') OR public.has_site_survey_permission(auth.uid(), 'site_survey_perfis'));

CREATE TRIGGER site_survey_access_profiles_updated_at BEFORE UPDATE ON public.site_survey_access_profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER site_survey_user_profiles_updated_at BEFORE UPDATE ON public.site_survey_user_profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.sync_site_survey_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.app_key = 'site_survey' THEN
    INSERT INTO public.site_survey_user_profiles (user_id, profile_code)
    VALUES (NEW.user_id, CASE WHEN public.is_erp_admin(NEW.user_id) THEN 'administrador' ELSE 'tecnico' END)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END
$$;
CREATE TRIGGER sync_site_survey_profile_after_access AFTER INSERT ON public.user_app_access FOR EACH ROW EXECUTE FUNCTION public.sync_site_survey_user_profile();

INSERT INTO public.site_survey_access_profiles (code, name, active, is_system) VALUES
  ('administrador', 'Administrador', true, true),
  ('tecnico', 'Técnico', true, true)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.site_survey_profile_permissions (profile_code, permission_key, allowed)
SELECT 'administrador', permission_key, true FROM (VALUES
  ('site_survey_visitas'), ('site_survey_visitas_minhas'), ('site_survey_visitas_todas'), ('site_survey_agendar'),
  ('site_survey_editar'), ('site_survey_executar'), ('site_survey_revisar'), ('site_survey_excluir'),
  ('site_survey_usuarios'), ('site_survey_perfis'), ('site_survey_logs'), ('site_survey_configuracoes')
) AS p(permission_key)
ON CONFLICT (profile_code, permission_key) DO NOTHING;

INSERT INTO public.site_survey_profile_permissions (profile_code, permission_key, allowed)
SELECT 'tecnico', permission_key, true FROM (VALUES
  ('site_survey_visitas'), ('site_survey_visitas_minhas'), ('site_survey_executar')
) AS p(permission_key)
ON CONFLICT (profile_code, permission_key) DO NOTHING;

INSERT INTO public.site_survey_user_profiles (user_id, profile_code)
SELECT uaa.user_id, CASE WHEN public.is_erp_admin(uaa.user_id) THEN 'administrador' ELSE 'tecnico' END
FROM public.user_app_access uaa
WHERE uaa.app_key = 'site_survey'
ON CONFLICT (user_id) DO NOTHING;