DO $$ DECLARE d text; BEGIN
  SELECT pg_get_functiondef('public.spend_resolve_missing_receipt(uuid,timestamptz,text)'::regprocedure) INTO d;
  d := replace(d, '_reason NOT IN (''lost'',''not_applicable'')', '_reason<>''lost''');
  EXECUTE d;
END $$;
REVOKE ALL ON FUNCTION public.spend_resolve_missing_receipt(uuid,timestamptz,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.spend_resolve_missing_receipt(uuid,timestamptz,text) TO authenticated, service_role;