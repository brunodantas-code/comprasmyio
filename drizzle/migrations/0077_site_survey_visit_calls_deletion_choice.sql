CREATE OR REPLACE FUNCTION public.list_site_survey_visit_calls(_visit_id uuid)
RETURNS TABLE(id uuid, call_number text, title text, description text, status text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.has_site_survey_permission(auth.uid(), 'site_survey_excluir') THEN
    RAISE EXCEPTION 'Sem permissão para excluir visitas' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.site_survey_visits v WHERE v.id = _visit_id) THEN
    RAISE EXCEPTION 'Visita não encontrada';
  END IF;
  RETURN QUERY
    SELECT c.id, c.call_number, c.title, c.description, c.status
    FROM public.internal_calls c
    WHERE c.site_survey_visit_id = _visit_id
       OR c.id IN (SELECT g.internal_call_id FROM public.site_survey_generated_calls g WHERE g.visit_id = _visit_id AND g.internal_call_id IS NOT NULL)
    ORDER BY c.call_number NULLS LAST, c.created_at;
END;
$$;
REVOKE ALL ON FUNCTION public.list_site_survey_visit_calls(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_site_survey_visit_calls(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.delete_site_survey_visit(_visit_id uuid, _delete_calls boolean)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _call_ids uuid[];
  _call_count integer;
BEGIN
  IF NOT public.has_site_survey_permission(auth.uid(), 'site_survey_excluir') THEN
    RAISE EXCEPTION 'Sem permissão para excluir visitas' USING ERRCODE = '42501';
  END IF;
  IF _delete_calls IS NULL THEN
    RAISE EXCEPTION 'É necessário escolher o destino dos chamados';
  END IF;
  PERFORM 1 FROM public.site_survey_visits WHERE id = _visit_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Visita não encontrada';
  END IF;
  SELECT COALESCE(array_agg(c.id), ARRAY[]::uuid[]) INTO _call_ids
  FROM public.internal_calls c
  WHERE c.site_survey_visit_id = _visit_id
     OR c.id IN (SELECT g.internal_call_id FROM public.site_survey_generated_calls g WHERE g.visit_id = _visit_id AND g.internal_call_id IS NOT NULL);
  _call_count := cardinality(_call_ids);
  IF _delete_calls THEN
    DELETE FROM public.internal_calls WHERE id = ANY(_call_ids);
  END IF;
  DELETE FROM public.site_survey_visits WHERE id = _visit_id;
  RETURN CASE WHEN _delete_calls THEN _call_count ELSE 0 END;
END;
$$;
REVOKE ALL ON FUNCTION public.delete_site_survey_visit(uuid, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_site_survey_visit(uuid, boolean) TO authenticated;