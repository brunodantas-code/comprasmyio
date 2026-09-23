DO $$
DECLARE
  definition text;
  expected text := E'  IF idx = 0 THEN\n    UPDATE public.purchase_orders SET approval_status = ''aprovado'', approved_at = COALESCE(approved_at, now())\n    WHERE id = NEW.id AND approval_status <> ''aprovado'';\n  ELSE';
  replacement text := E'  IF idx = 0 AND NOT auto_ok THEN\n    RAISE EXCEPTION ''Nenhum aprovador ativo foi encontrado para esta solicitação. Configure a hierarquia ou uma etapa adicional.'';\n  ELSIF idx = 0 THEN\n    UPDATE public.purchase_orders SET approval_status = ''aprovado'', approved_at = COALESCE(approved_at, now())\n    WHERE id = NEW.id AND approval_status <> ''aprovado'';\n  ELSE';
BEGIN
  SELECT pg_get_functiondef('public.build_approval_chain()'::regprocedure) INTO definition;
  IF position(expected IN definition) = 0 THEN
    RAISE EXCEPTION 'Trecho esperado não encontrado em public.build_approval_chain()';
  END IF;
  EXECUTE replace(definition, expected, replacement);
END;
$$;