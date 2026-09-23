CREATE OR REPLACE FUNCTION public.get_site_survey_users()
RETURNS TABLE(id uuid, full_name text, email text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT DISTINCT p.id, p.full_name, p.email
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
    )
  ORDER BY p.full_name
$function$;

GRANT EXECUTE ON FUNCTION public.get_site_survey_users() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_site_survey_users() TO service_role;