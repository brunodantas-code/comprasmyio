CREATE OR REPLACE FUNCTION public.import_survey_client_report(_visit_id uuid, _file_name text, _storage_path text, _items jsonb, _edits jsonb) RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE e jsonb; r public.site_survey_responses; v_point_id uuid; v_point_kind text; report_id uuid; conf jsonb := '[]'::jsonb;
BEGIN
IF auth.uid() IS NULL OR NOT public.can_view_site_survey_visit(_visit_id, auth.uid()) OR NOT public.has_site_survey_permission(auth.uid(), 'site_survey_executar') THEN RAISE EXCEPTION 'Sem permissão para importar respostas.'; END IF;
IF _storage_path NOT LIKE _visit_id::text || '/%' OR jsonb_typeof(_items) <> 'array' OR jsonb_typeof(_edits) <> 'array' THEN RAISE EXCEPTION 'Importação inválida.'; END IF;
PERFORM 1 FROM public.site_survey_visits WHERE id = _visit_id FOR UPDATE;
FOR e IN SELECT value FROM jsonb_array_elements(_items) LOOP
 v_point_kind := split_part(e->>'point', ':', 1); v_point_id := nullif(split_part(e->>'point', ':', 2),'')::uuid;
 IF v_point_id IS NOT NULL THEN
  IF v_point_kind = 'luc' THEN PERFORM 1 FROM public.site_survey_visit_lucs WHERE id=v_point_id AND visit_id=_visit_id AND active; ELSIF v_point_kind='environment' THEN PERFORM 1 FROM public.site_survey_visit_environments WHERE id=v_point_id AND visit_id=_visit_id AND active; ELSE RAISE EXCEPTION 'Tipo de ponto inválido.'; END IF;
  IF NOT FOUND THEN RAISE EXCEPTION 'Ponto não encontrado nesta visita.'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(v_point_id::text,4107));
  IF EXISTS(SELECT 1 FROM public.site_survey_point_edit_locks l WHERE l.point_id=v_point_id AND l.expires_at>clock_timestamp() AND l.user_id<>auth.uid()) THEN RAISE EXCEPTION 'Um dos pontos está sendo editado por outro usuário.'; END IF;
 END IF;
 IF e->>'kind'='confirmation' THEN
  IF e->>'category' NOT IN ('duplicate','vacant') OR e->>'answer' NOT IN ('OK','Duplicado') OR v_point_id IS NULL THEN RAISE EXCEPTION 'Confirmação inválida.'; END IF;
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(_items) other WHERE other->>'point'=e->>'point' AND other->>'category'=e->>'category' AND other->>'kind'='confirmation' AND other->>'answer'<>e->>'answer') THEN RAISE EXCEPTION 'Confirmações conflitantes.'; END IF;
  conf := conf || jsonb_build_array(e);
 END IF;
END LOOP;
FOR e IN SELECT value FROM jsonb_array_elements(_edits) LOOP
 IF e->>'id' IS NOT NULL THEN
  SELECT * INTO r FROM public.site_survey_responses WHERE id=(e->>'id')::uuid AND visit_id=_visit_id FOR UPDATE;
  IF NOT FOUND OR r.answer IS DISTINCT FROM e->'expected' THEN RAISE EXCEPTION 'O checklist mudou. Reabra o PDF antes de importar.'; END IF;
  UPDATE public.site_survey_responses SET answer=e->'answer', answered_by=auth.uid() WHERE id=r.id;
 ELSE
  IF (e->>'lucId') IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.site_survey_visit_lucs WHERE id=(e->>'lucId')::uuid AND visit_id=_visit_id) OR (e->>'environmentId') IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.site_survey_visit_environments WHERE id=(e->>'environmentId')::uuid AND visit_id=_visit_id) THEN RAISE EXCEPTION 'Ponto não pertence à visita.'; END IF;
  INSERT INTO public.site_survey_responses(visit_id,question_id,visit_luc_id,visit_environment_id,answer,answered_by) VALUES(_visit_id,(e->>'questionId')::uuid,(e->>'lucId')::uuid,(e->>'environmentId')::uuid,e->'answer',auth.uid());
 END IF;
END LOOP;
INSERT INTO public.site_survey_client_report_imports(visit_id,uploaded_by,file_name,storage_path,confirmations,imported_items) VALUES(_visit_id,auth.uid(),_file_name,_storage_path,conf,_items) RETURNING id INTO report_id;
RETURN report_id;
END $$;
REVOKE ALL ON FUNCTION public.import_survey_client_report(uuid,text,text,jsonb,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.import_survey_client_report(uuid,text,text,jsonb,jsonb) TO authenticated,service_role;