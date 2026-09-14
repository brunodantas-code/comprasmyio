CREATE TABLE public.erp_apps (
  key text PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  active boolean NOT NULL DEFAULT true,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.erp_apps TO authenticated;
GRANT ALL ON public.erp_apps TO service_role;
ALTER TABLE public.erp_apps ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.erp_admins (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);
GRANT SELECT, INSERT, DELETE ON public.erp_admins TO authenticated;
GRANT ALL ON public.erp_admins TO service_role;
ALTER TABLE public.erp_admins ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_app_access (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  app_key text NOT NULL REFERENCES public.erp_apps(key) ON DELETE CASCADE,
  granted_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, app_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_app_access TO authenticated;
GRANT ALL ON public.user_app_access TO service_role;
ALTER TABLE public.user_app_access ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_erp_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.erp_admins WHERE user_id = _user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.has_app_access(_user_id uuid, _app_key text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_app_access
    WHERE user_id = _user_id AND app_key = _app_key
  );
$$;

REVOKE ALL ON FUNCTION public.is_erp_admin(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_app_access(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_erp_admin(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_app_access(uuid, text) TO authenticated, service_role;

CREATE POLICY "Authenticated users can view active ERP apps"
ON public.erp_apps FOR SELECT TO authenticated
USING (active OR public.is_erp_admin(auth.uid()));

CREATE POLICY "Users can view their ERP admin status"
ON public.erp_admins FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_erp_admin(auth.uid()));

CREATE POLICY "ERP admins can add ERP admins"
ON public.erp_admins FOR INSERT TO authenticated
WITH CHECK (public.is_erp_admin(auth.uid()));

CREATE POLICY "ERP admins can remove ERP admins"
ON public.erp_admins FOR DELETE TO authenticated
USING (public.is_erp_admin(auth.uid()));

CREATE POLICY "Users can view own app access"
ON public.user_app_access FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_erp_admin(auth.uid()));

CREATE POLICY "ERP admins can grant app access"
ON public.user_app_access FOR INSERT TO authenticated
WITH CHECK (public.is_erp_admin(auth.uid()));

CREATE POLICY "ERP admins can update app access"
ON public.user_app_access FOR UPDATE TO authenticated
USING (public.is_erp_admin(auth.uid()))
WITH CHECK (public.is_erp_admin(auth.uid()));

CREATE POLICY "ERP admins can revoke app access"
ON public.user_app_access FOR DELETE TO authenticated
USING (public.is_erp_admin(auth.uid()));

CREATE TRIGGER erp_apps_set_updated_at
BEFORE UPDATE ON public.erp_apps
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER user_app_access_set_updated_at
BEFORE UPDATE ON public.user_app_access
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.erp_apps (key, name, description, position)
VALUES
  ('supply', 'myio supply', 'Compras, solicitações, aprovações e estoque.', 1),
  ('cash_flow', 'myio cash flow', 'Gestão financeira e fluxo de caixa.', 2);

INSERT INTO public.user_app_access (user_id, app_key)
SELECT p.id, 'supply'
FROM public.profiles p
WHERE p.deleted_at IS NULL
ON CONFLICT (user_id, app_key) DO NOTHING;

INSERT INTO public.erp_admins (user_id, created_by)
SELECT DISTINCT uap.user_id, uap.user_id
FROM public.user_access_profiles uap
JOIN public.profiles p ON p.id = uap.user_id
WHERE uap.profile = 'admin' AND p.deleted_at IS NULL
ON CONFLICT (user_id) DO NOTHING;