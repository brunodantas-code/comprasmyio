CREATE FUNCTION public.legal_participant_users()
RETURNS TABLE(id uuid, full_name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT p.id, p.full_name
  FROM public.profiles p
  WHERE auth.uid() IS NOT NULL
    AND public.security_app_access(ARRAY['legal'])
    AND p.deleted_at IS NULL
    AND nullif(btrim(p.full_name), '') IS NOT NULL
  ORDER BY p.full_name;
$$;
REVOKE ALL ON FUNCTION public.legal_participant_users() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.legal_participant_users() TO authenticated;