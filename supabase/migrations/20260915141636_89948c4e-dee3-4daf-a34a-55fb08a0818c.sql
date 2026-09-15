CREATE TABLE public.access_profile_permissions (
  profile_code text NOT NULL REFERENCES public.access_profile_definitions(code) ON UPDATE CASCADE ON DELETE CASCADE,
  menu_key text NOT NULL,
  allowed boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (profile_code, menu_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.access_profile_permissions TO authenticated;
GRANT ALL ON public.access_profile_permissions TO service_role;
ALTER TABLE public.access_profile_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users view access profile permissions"
ON public.access_profile_permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins create access profile permissions"
ON public.access_profile_permissions FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update access profile permissions"
ON public.access_profile_permissions FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete access profile permissions"
ON public.access_profile_permissions FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER access_profile_permissions_set_updated_at
BEFORE UPDATE ON public.access_profile_permissions
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.user_access_profiles
ADD COLUMN is_customized boolean NOT NULL DEFAULT false;

UPDATE public.user_access_profiles
SET is_customized = true
WHERE profile = 'restrito'::public.access_profile;

INSERT INTO public.access_profile_permissions (profile_code, menu_key, allowed)
SELECT 'padrao', menu_key, true
FROM unnest(ARRAY[
  'solicitacoes', 'solicitacoes_minhas', 'solicitacoes_novas',
  'approvals', 'approvals_pendentes', 'approvals_meus', 'approvals_todos', 'approvals_consolidado',
  'armazem'
]::text[]) AS menu_key
ON CONFLICT (profile_code, menu_key) DO UPDATE SET allowed = EXCLUDED.allowed;

CREATE OR REPLACE FUNCTION public.sync_new_user_access_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_access_profiles (user_id, profile, profile_definition_id, is_customized)
  VALUES (NEW.id, 'restrito'::public.access_profile, 'restrito', true)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.sync_new_user_access_profile() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_new_user_access_profile() TO service_role;