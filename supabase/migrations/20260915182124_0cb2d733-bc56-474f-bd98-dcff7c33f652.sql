CREATE TABLE public.access_profile_request_types (
  profile_code text NOT NULL REFERENCES public.access_profile_definitions(code) ON UPDATE CASCADE ON DELETE CASCADE,
  request_type_code text NOT NULL REFERENCES public.request_types(code) ON UPDATE CASCADE ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (profile_code, request_type_code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.access_profile_request_types TO authenticated;
GRANT ALL ON public.access_profile_request_types TO service_role;
ALTER TABLE public.access_profile_request_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users view profile request types"
ON public.access_profile_request_types FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins create profile request types"
ON public.access_profile_request_types FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update profile request types"
ON public.access_profile_request_types FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete profile request types"
ON public.access_profile_request_types FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.user_request_type_permissions (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  request_type_code text NOT NULL REFERENCES public.request_types(code) ON UPDATE CASCADE ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, request_type_code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_request_type_permissions TO authenticated;
GRANT ALL ON public.user_request_type_permissions TO service_role;
ALTER TABLE public.user_request_type_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own request type permissions"
ON public.user_request_type_permissions FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins create user request type permissions"
ON public.user_request_type_permissions FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update user request type permissions"
ON public.user_request_type_permissions FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete user request type permissions"
ON public.user_request_type_permissions FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.access_profile_request_types (profile_code, request_type_code)
SELECT definition.code, request_type.code
FROM public.access_profile_definitions AS definition
CROSS JOIN public.request_types AS request_type
WHERE request_type.active = true
ON CONFLICT DO NOTHING;

INSERT INTO public.user_request_type_permissions (user_id, request_type_code)
SELECT access.user_id, request_type.code
FROM public.user_access_profiles AS access
CROSS JOIN public.request_types AS request_type
WHERE access.is_customized = true
  AND request_type.active = true
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.can_request_type(_user_id uuid, _request_type_code text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_access_profiles AS access
    WHERE access.user_id = _user_id
      AND (
        access.profile = 'admin'::public.access_profile
        OR (
          access.is_customized = true
          AND EXISTS (
            SELECT 1
            FROM public.user_request_type_permissions AS individual
            WHERE individual.user_id = _user_id
              AND individual.request_type_code = _request_type_code
          )
        )
        OR (
          access.is_customized = false
          AND EXISTS (
            SELECT 1
            FROM public.access_profile_request_types AS profile_permission
            WHERE profile_permission.profile_code = access.profile_definition_id
              AND profile_permission.request_type_code = _request_type_code
          )
        )
      )
  )
$$;
REVOKE ALL ON FUNCTION public.can_request_type(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_request_type(uuid, text) TO authenticated, service_role;

DROP POLICY IF EXISTS "orders_insert_own" ON public.purchase_orders;
CREATE POLICY "orders_insert_own" ON public.purchase_orders
FOR INSERT TO authenticated
WITH CHECK (requester_id = auth.uid() AND public.can_request_type(auth.uid(), request_type));

DROP POLICY IF EXISTS "import_batches_insert" ON public.import_batches;
CREATE POLICY "import_batches_insert" ON public.import_batches
FOR INSERT TO authenticated
WITH CHECK ((created_by = auth.uid() AND public.can_request_type(auth.uid(), 'importacao')) OR public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.enforce_myio_request_type_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.can_request_type(NEW.created_by, 'dispositivos') THEN
    RAISE EXCEPTION 'Usuário sem acesso a solicitações de Dispositivos myio';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.enforce_myio_request_type_access() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enforce_myio_request_type_access() TO service_role;
CREATE TRIGGER enforce_myio_request_type_access
BEFORE INSERT ON public.myio_orders
FOR EACH ROW EXECUTE FUNCTION public.enforce_myio_request_type_access();