CREATE OR REPLACE FUNCTION public.is_supply_member(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.has_role(_user_id, 'comprador'::public.app_role)
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      JOIN public.job_titles jt ON jt.id = p.job_title_id
      WHERE p.id = _user_id
        AND lower(trim(jt.name)) LIKE '%supply%'
        AND jt.active = true
        AND p.deleted_at IS NULL
    )
$$;

GRANT EXECUTE ON FUNCTION public.is_supply_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_supply_member(uuid) TO service_role;