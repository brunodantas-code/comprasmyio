ALTER FUNCTION public.log_development_ticket_change() SET SCHEMA private;
REVOKE ALL ON FUNCTION private.log_development_ticket_change() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.log_development_ticket_change() TO service_role;