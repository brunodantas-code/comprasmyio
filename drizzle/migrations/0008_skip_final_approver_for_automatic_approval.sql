DO $migration$
DECLARE
  function_definition text;
BEGIN
  SELECT pg_get_functiondef('public.build_approval_chain()'::regprocedure)
    INTO function_definition;

  IF position('IF NOT auto_ok AND final_id IS NOT NULL THEN' IN function_definition) > 0 THEN
    RETURN;
  END IF;

  IF position('IF final_id IS NOT NULL THEN' IN function_definition) = 0 THEN
    RAISE EXCEPTION 'Trecho esperado não encontrado em public.build_approval_chain()';
  END IF;

  function_definition := replace(
    function_definition,
    'IF final_id IS NOT NULL THEN',
    'IF NOT auto_ok AND final_id IS NOT NULL THEN'
  );

  EXECUTE function_definition;
END;
$migration$;