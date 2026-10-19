CREATE OR REPLACE FUNCTION public.survey_point_edit_lease(_point_id uuid, _point_kind text, _session_id uuid, _release boolean DEFAULT false, _acquire boolean DEFAULT true)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_visit uuid; v_lock public.site_survey_point_edit_locks%ROWTYPE; v_name text;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
 IF _point_kind = 'luc' THEN SELECT visit_id INTO v_visit FROM public.site_survey_visit_lucs WHERE id = _point_id;
 ELSIF _point_kind = 'environment' THEN SELECT visit_id INTO v_visit FROM public.site_survey_visit_environments WHERE id = _point_id;
 ELSE RAISE EXCEPTION 'Ponto inválido'; END IF;
 IF v_visit IS NULL OR NOT public.can_view_site_survey_visit(v_visit, auth.uid()) THEN RAISE EXCEPTION 'Sem acesso à visita'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(_point_id::text, 4107));
 IF _release THEN
  DELETE FROM public.site_survey_point_edit_locks WHERE point_id = _point_id AND user_id = auth.uid() AND session_id = _session_id;
 ELSE
  IF _acquire AND (public.has_site_survey_permission(auth.uid(), 'site_survey_executar') OR public.has_site_survey_permission(auth.uid(), 'site_survey_editar')) THEN
   -- The same user may take over a lease held by another of their own windows/screens.
   INSERT INTO public.site_survey_point_edit_locks(point_id, point_kind, visit_id, user_id, session_id, expires_at) VALUES (_point_id, _point_kind, v_visit, auth.uid(), _session_id, clock_timestamp() + interval '90 seconds')
   ON CONFLICT (point_id) DO UPDATE SET user_id = EXCLUDED.user_id, session_id = EXCLUDED.session_id, expires_at = EXCLUDED.expires_at
   WHERE site_survey_point_edit_locks.expires_at <= clock_timestamp() OR site_survey_point_edit_locks.user_id = auth.uid();
  END IF;
 END IF;
 SELECT * INTO v_lock FROM public.site_survey_point_edit_locks WHERE point_id = _point_id AND expires_at > clock_timestamp();
 SELECT full_name INTO v_name FROM public.profiles WHERE id = v_lock.user_id;
 RETURN jsonb_build_object('editable', v_lock.user_id = auth.uid() AND (v_lock.session_id = _session_id OR NOT _acquire OR _release), 'editor', COALESCE(NULLIF(v_name, ''), 'Outro usuário'), 'occupied', v_lock.point_id IS NOT NULL);
END;
$function$;