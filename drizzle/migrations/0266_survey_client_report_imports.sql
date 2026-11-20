CREATE TABLE public.site_survey_client_report_imports (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), visit_id uuid NOT NULL REFERENCES public.site_survey_visits(id) ON DELETE CASCADE, uploaded_by uuid NOT NULL REFERENCES public.profiles(id), file_name text NOT NULL, storage_path text NOT NULL UNIQUE, confirmations jsonb NOT NULL DEFAULT '[]'::jsonb, imported_items jsonb NOT NULL DEFAULT '[]'::jsonb, created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT, INSERT ON public.site_survey_client_report_imports TO authenticated;
GRANT ALL ON public.site_survey_client_report_imports TO service_role;
ALTER TABLE public.site_survey_client_report_imports ENABLE ROW LEVEL SECURITY;
CREATE POLICY client_report_read ON public.site_survey_client_report_imports FOR SELECT TO authenticated USING (public.can_view_site_survey_visit(visit_id, auth.uid()));
CREATE POLICY client_report_insert ON public.site_survey_client_report_imports FOR INSERT TO authenticated WITH CHECK (uploaded_by = auth.uid() AND public.can_view_site_survey_visit(visit_id, auth.uid()) AND public.has_site_survey_permission(auth.uid(), 'site_survey_executar'));
CREATE INDEX ON public.site_survey_client_report_imports(visit_id, created_at);
CREATE FUNCTION public.import_survey_client_report(_visit_id uuid, _file_name text, _storage_path text, _items jsonb, _edits jsonb) RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE e jsonb; r public.site_survey_responses; point_id uuid; point_kind text; template uuid; report_id uuid; conf jsonb := '[]'::jsonb;
BEGIN
IF auth.uid() IS NULL OR NOT public.can_view_site_survey_visit(_visit_id, auth.uid()) OR NOT public.has_site_survey_permission(auth.uid(), 'site_survey_executar') THEN RAISE EXCEPTION 'Sem permissão para importar respostas.'; END IF;
IF _storage_path NOT LIKE _visit_id::text || '/%' OR jsonb_typeof(_items) <> 'array' OR jsonb_typeof(_edits) <> 'array' THEN RAISE EXCEPTION 'Importação inválida.'; END IF;
PERFORM 1 FROM public.site_survey_visits WHERE id = _visit_id FOR UPDATE;
FOR e IN SELECT value FROM jsonb_array_elements(_items) LOOP
 point_kind := split_part(e->>'point', ':', 1); point_id := nullif(split_part(e->>'point', ':', 2),'')::uuid;
 IF point_id IS NOT NULL THEN
  IF point_kind = 'luc' THEN PERFORM 1 FROM public.site_survey_visit_lucs WHERE id=point_id AND visit_id=_visit_id AND active; ELSE PERFORM 1 FROM public.site_survey_visit_environments WHERE id=point_id AND visit_id=_visit_id AND active; END IF;
  IF NOT FOUND THEN RAISE EXCEPTION 'Ponto não encontrado nesta visita.'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(point_id::text,4107));
  IF EXISTS(SELECT 1 FROM public.site_survey_point_edit_locks WHERE site_survey_point_edit_locks.point_id=point_id AND expires_at>clock_timestamp() AND user_id<>auth.uid()) THEN RAISE EXCEPTION 'Um dos pontos está sendo editado por outro usuário.'; END IF;
 END IF;
 IF e->>'kind'='confirmation' THEN
  IF e->>'category' NOT IN ('duplicate','vacant') OR e->>'answer' NOT IN ('OK','Duplicado') OR point_id IS NULL THEN RAISE EXCEPTION 'Confirmação inválida.'; END IF;
  conf := conf || jsonb_build_array(e);
 END IF;
END LOOP;
FOR e IN SELECT value FROM jsonb_array_elements(_edits) LOOP
 IF e->>'id' IS NOT NULL THEN
  SELECT * INTO r FROM public.site_survey_responses WHERE id=(e->>'id')::uuid AND visit_id=_visit_id FOR UPDATE;
  IF NOT FOUND OR r.answer IS DISTINCT FROM e->'expected' THEN RAISE EXCEPTION 'O checklist mudou. Reabra o PDF antes de importar.'; END IF;
  UPDATE public.site_survey_responses SET answer=e->'answer', answered_by=auth.uid() WHERE id=r.id;
 ELSE
  INSERT INTO public.site_survey_responses(visit_id,question_id,visit_luc_id,visit_environment_id,answer,answered_by) VALUES(_visit_id,(e->>'questionId')::uuid,(e->>'lucId')::uuid,(e->>'environmentId')::uuid,e->'answer',auth.uid());
 END IF;
END LOOP;
INSERT INTO public.site_survey_client_report_imports(visit_id,uploaded_by,file_name,storage_path,confirmations,imported_items) VALUES(_visit_id,auth.uid(),_file_name,_storage_path,conf,_items) RETURNING id INTO report_id;
RETURN report_id;
END $$;
REVOKE ALL ON FUNCTION public.import_survey_client_report(uuid,text,text,jsonb,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.import_survey_client_report(uuid,text,text,jsonb,jsonb) TO authenticated,service_role;