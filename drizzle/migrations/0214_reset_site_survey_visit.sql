CREATE OR REPLACE FUNCTION public.reset_site_survey_visit(_visit_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _status text; _count integer;
BEGIN
  IF NOT public.has_site_survey_permission(auth.uid(), 'site_survey_excluir') THEN
    RAISE EXCEPTION 'Sem permissão para reiniciar visitas' USING ERRCODE = '42501';
  END IF;
  SELECT status INTO _status FROM public.site_survey_visits WHERE id = _visit_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Visita não encontrada'; END IF;
  IF _status NOT IN ('agendada','em_andamento','em_revisao') THEN
    RAISE EXCEPTION 'Somente visitas não concluídas e não canceladas podem ser reiniciadas';
  END IF;
  SELECT count(*) INTO _count FROM public.site_survey_responses WHERE visit_id = _visit_id;
  DELETE FROM public.site_survey_attachments WHERE visit_id = _visit_id;
  DELETE FROM public.site_survey_responses WHERE visit_id = _visit_id;
  DELETE FROM public.site_survey_point_pauses WHERE visit_id = _visit_id;
  DELETE FROM public.site_survey_point_edit_locks WHERE visit_id = _visit_id;
  UPDATE public.site_survey_visit_lucs SET started_at = NULL, completed_at = NULL, last_progress_at = NULL, pending_fields = '[]'::jsonb WHERE visit_id = _visit_id;
  UPDATE public.site_survey_visit_environments SET started_at = NULL, completed_at = NULL, last_progress_at = NULL, pending_fields = '[]'::jsonb WHERE visit_id = _visit_id;
  UPDATE public.site_survey_visits SET status = 'agendada', started_at = NULL, submitted_at = NULL, completed_at = NULL WHERE id = _visit_id;
  INSERT INTO public.site_survey_logs (visit_id, actor_id, action, details)
  VALUES (_visit_id, auth.uid(), 'visita_reiniciada', jsonb_build_object('status_anterior', _status, 'respostas_apagadas', _count));
  RETURN _count;
END; $$;
REVOKE ALL ON FUNCTION public.reset_site_survey_visit(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reset_site_survey_visit(uuid) TO authenticated;