ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS mobile_phone text;

COMMENT ON COLUMN public.profiles.mobile_phone IS 'Celular corporativo cadastrado no myio RH no formato (DDD) 9XXXX-XXXX.';

CREATE OR REPLACE FUNCTION public.is_supply_technician(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.job_titles jt
      ON jt.id = p.job_title_id
     AND jt.active = true
     AND jt.name ILIKE 'Técnico%'
    JOIN public.user_app_access uaa
      ON uaa.user_id = p.id
     AND uaa.app_key = 'supply'
    WHERE p.id = _user_id
      AND p.deleted_at IS NULL
  )
$$;

REVOKE ALL ON FUNCTION public.is_supply_technician(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_supply_technician(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_supply_technician(uuid) TO service_role;

DROP FUNCTION IF EXISTS public.get_site_survey_users();

CREATE FUNCTION public.get_site_survey_users()
RETURNS TABLE(id uuid, full_name text, email text, mobile_phone text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT p.id, p.full_name, p.email, p.mobile_phone
  FROM public.profiles p
  JOIN public.job_titles jt
    ON jt.id = p.job_title_id
   AND jt.active = true
   AND jt.name ILIKE 'Técnico%'
  JOIN public.user_app_access uaa
    ON uaa.user_id = p.id
   AND uaa.app_key = 'supply'
  WHERE p.deleted_at IS NULL
    AND (
      public.has_site_survey_permission(auth.uid(), 'site_survey_agendar')
      OR public.has_site_survey_permission(auth.uid(), 'site_survey_editar')
      OR public.has_site_survey_permission(auth.uid(), 'site_survey_perfis')
      OR EXISTS (
        SELECT 1
        FROM public.user_app_access caller_access
        WHERE caller_access.user_id = auth.uid()
          AND caller_access.app_key = 'rh'
      )
    )
  ORDER BY p.full_name
$$;

REVOKE ALL ON FUNCTION public.get_site_survey_users() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_site_survey_users() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_site_survey_users() TO service_role;

CREATE OR REPLACE FUNCTION public.set_technician_mobile_phone(_technician_id uuid, _mobile_phone text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  normalized_phone text := nullif(btrim(_mobile_phone), '');
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.user_app_access
    WHERE user_id = auth.uid()
      AND app_key = 'rh'
  ) THEN
    RAISE EXCEPTION 'Acesso ao myio RH não autorizado';
  END IF;

  IF NOT public.is_supply_technician(_technician_id) THEN
    RAISE EXCEPTION 'Usuário informado não é um técnico ativo do Supply';
  END IF;

  IF normalized_phone IS NOT NULL
     AND normalized_phone !~ '^\([0-9]{2}\) 9[0-9]{4}-[0-9]{4}$' THEN
    RAISE EXCEPTION 'Informe o celular no formato (DDD) 9XXXX-XXXX';
  END IF;

  UPDATE public.profiles
  SET mobile_phone = normalized_phone
  WHERE id = _technician_id;
END;
$$;

REVOKE ALL ON FUNCTION public.set_technician_mobile_phone(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_technician_mobile_phone(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_technician_mobile_phone(uuid, text) TO service_role;