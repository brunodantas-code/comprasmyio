ALTER TABLE public.profiles
ADD COLUMN deleted_at timestamptz,
ADD COLUMN deleted_by uuid;

CREATE TABLE public.user_deletion_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_user_id uuid NOT NULL REFERENCES public.profiles(id),
  requested_by uuid NOT NULL REFERENCES public.profiles(id),
  decided_by uuid REFERENCES public.profiles(id),
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovada', 'rejeitada', 'executada', 'falhou')),
  failure_reason text,
  requested_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (target_user_id <> requested_by),
  CHECK (decided_by IS NULL OR decided_by <> requested_by)
);
GRANT SELECT ON public.user_deletion_requests TO authenticated;
GRANT ALL ON public.user_deletion_requests TO service_role;
ALTER TABLE public.user_deletion_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view user deletion requests"
ON public.user_deletion_requests FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE UNIQUE INDEX user_deletion_requests_one_pending_per_user
ON public.user_deletion_requests (target_user_id)
WHERE status IN ('pendente', 'aprovada');

CREATE TRIGGER user_deletion_requests_set_updated_at
BEFORE UPDATE ON public.user_deletion_requests
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.enforce_max_two_access_admins()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  active_admins integer;
BEGIN
  IF NEW.profile <> 'admin' THEN
    RETURN NEW;
  END IF;

  SELECT count(*) INTO active_admins
  FROM public.user_access_profiles uap
  JOIN public.profiles p ON p.id = uap.user_id
  WHERE uap.profile = 'admin'
    AND p.deleted_at IS NULL
    AND uap.user_id <> NEW.user_id;

  IF active_admins >= 2 THEN
    RAISE EXCEPTION 'O limite de dois usuários com perfil Admin foi atingido.';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.enforce_max_two_access_admins() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.enforce_max_two_access_admins() TO service_role;

CREATE TRIGGER user_access_profiles_max_two_admins
BEFORE INSERT OR UPDATE OF profile ON public.user_access_profiles
FOR EACH ROW EXECUTE FUNCTION public.enforce_max_two_access_admins();

CREATE OR REPLACE FUNCTION public.set_user_access_profile(_target_user_id uuid, _profile public.access_profile)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Somente Admins podem alterar perfis de acesso.';
  END IF;
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = _target_user_id AND deleted_at IS NOT NULL) THEN
    RAISE EXCEPTION 'Não é possível alterar um usuário excluído.';
  END IF;

  INSERT INTO public.user_access_profiles (user_id, profile)
  VALUES (_target_user_id, _profile)
  ON CONFLICT (user_id) DO UPDATE SET profile = EXCLUDED.profile;

  IF _profile = 'admin' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (_target_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    DELETE FROM public.user_roles WHERE user_id = _target_user_id AND role = 'admin';
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.set_user_access_profile(uuid, public.access_profile) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_user_access_profile(uuid, public.access_profile) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.request_user_deletion(_target_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  request_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Somente Admins podem solicitar exclusões.';
  END IF;
  IF _target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Você não pode solicitar a exclusão da sua própria conta.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = _target_user_id AND deleted_at IS NULL) THEN
    RAISE EXCEPTION 'Usuário não encontrado ou já excluído.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.user_deletion_requests
    WHERE target_user_id = _target_user_id AND status IN ('pendente', 'aprovada')
  ) THEN
    RAISE EXCEPTION 'Já existe uma exclusão pendente para este usuário.';
  END IF;

  INSERT INTO public.user_deletion_requests (target_user_id, requested_by)
  VALUES (_target_user_id, auth.uid())
  RETURNING id INTO request_id;
  RETURN request_id;
END;
$$;
REVOKE ALL ON FUNCTION public.request_user_deletion(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_user_deletion(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.decide_user_deletion(_request_id uuid, _approve boolean)
RETURNS TABLE(target_user_id uuid, status text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  req public.user_deletion_requests%ROWTYPE;
  next_status text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Somente Admins podem decidir exclusões.';
  END IF;

  SELECT * INTO req FROM public.user_deletion_requests
  WHERE id = _request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Solicitação não encontrada.'; END IF;
  IF req.status <> 'pendente' THEN RAISE EXCEPTION 'Esta solicitação já foi decidida.'; END IF;
  IF req.requested_by = auth.uid() THEN
    RAISE EXCEPTION 'A exclusão deve ser autorizada por outro Admin.';
  END IF;

  next_status := CASE WHEN _approve THEN 'aprovada' ELSE 'rejeitada' END;
  UPDATE public.user_deletion_requests
  SET status = next_status, decided_by = auth.uid(), decided_at = now()
  WHERE id = _request_id;

  RETURN QUERY SELECT req.target_user_id, next_status;
END;
$$;
REVOKE ALL ON FUNCTION public.decide_user_deletion(uuid, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.decide_user_deletion(uuid, boolean) TO authenticated, service_role;