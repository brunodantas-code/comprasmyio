REVOKE ALL ON FUNCTION public.validate_myio_operational_release() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.validate_myio_operational_release() TO service_role;