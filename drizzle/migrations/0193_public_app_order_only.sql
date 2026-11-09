CREATE OR REPLACE FUNCTION public.public_app_order() RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$ SELECT variant_key FROM public.cde_selected WHERE group_key = 'app_order' AND is_primary = true LIMIT 1 $$;
REVOKE ALL ON FUNCTION public.public_app_order() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_app_order() TO anon, authenticated;
COMMENT ON FUNCTION public.public_app_order() IS 'Public app ordering only; no user identifiers or other CDE settings.';