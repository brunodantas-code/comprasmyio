REVOKE ALL ON FUNCTION public.has_job_title_name(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_job_title_name(uuid, text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_job_title_name(uuid, text) TO service_role;