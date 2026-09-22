DO $migration$
DECLARE
  current_definition text;
  updated_definition text;
BEGIN
  SELECT pg_get_functiondef('public.build_approval_chain()'::regprocedure)
  INTO current_definition;

  updated_definition := replace(
    current_definition,
    E'  ELSE final_id := NULL;\n  END IF;\n\n  IF NEW.request_model = ''dispositivos'' THEN',
    E'  ELSE final_id := NULL;\n  END IF;\n\n  -- C-Level usa somente o primeiro superior configurado (normalmente o CEO).\n  -- O CEO segue a configuração específica de aprovador de despesas.\n  IF requester_is_c_level THEN\n    final_id := NULL;\n    final_lbl := NULL;\n  END IF;\n\n  IF NEW.request_model = ''dispositivos'' THEN'
  );

  IF updated_definition = current_definition THEN
    RAISE EXCEPTION 'Não foi possível localizar o trecho esperado em build_approval_chain().';
  END IF;

  EXECUTE updated_definition;
END;
$migration$;