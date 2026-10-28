DO $$
DECLARE definition text; invalid_branch text := '_project_id := NULL; SELECT client_id, client_unit_id INTO _client_id, _client_unit_id FROM public.projects WHERE id = _project_id; IF _client_id IS NULL THEN RAISE EXCEPTION ''Vincule um Cliente ao Projeto no Cadastro antes de solicitar a compra.''; END IF;';
BEGIN
 SELECT pg_get_functiondef('public.admin_edit_purchase_approval(uuid,jsonb,jsonb)'::regprocedure) INTO definition;
 IF strpos(definition, invalid_branch) = 0 THEN RAISE EXCEPTION 'Não foi encontrado o trecho esperado da alocação interna.'; END IF;
 EXECUTE replace(definition, invalid_branch, '_project_id := NULL; _client_id := NULL; _client_unit_id := NULL;');
END;
$$;