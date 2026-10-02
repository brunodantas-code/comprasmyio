DO $$
DECLARE
  definition text;
  requester_check text := 'public.has_job_title_name(NEW.requester_id, ''Financeiro'')';
  approver_check text := 'public.has_job_title_name(p2.id, ''Financeiro'')';
BEGIN
  SELECT pg_get_functiondef('public.build_approval_chain()'::regprocedure) INTO definition;
  IF position(requester_check IN definition) = 0 OR position(approver_check IN definition) = 0 THEN
    RAISE EXCEPTION 'A regra de aprovação de pagamento mudou; revisar antes de alterar.';
  END IF;
  definition := replace(definition, requester_check,
    '(public.has_role(NEW.requester_id, ''financeiro''::public.app_role) OR public.has_job_title_name(NEW.requester_id, ''Financeiro'') OR public.has_job_title_name(NEW.requester_id, ''Analista Adm. Financeiro''))');
  definition := replace(definition, approver_check,
    '(public.has_role(p2.id, ''financeiro''::public.app_role) OR public.has_job_title_name(p2.id, ''Financeiro'') OR public.has_job_title_name(p2.id, ''Analista Adm. Financeiro''))');
  EXECUTE definition;
END;
$$;