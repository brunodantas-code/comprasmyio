CREATE TABLE public.site_survey_point_edit_locks (
 point_id uuid PRIMARY KEY,
 point_kind text NOT NULL,
 visit_id uuid NOT NULL REFERENCES public.site_survey_visits(id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES public.profiles(id),
 session_id uuid NOT NULL,
 expires_at timestamptz NOT NULL DEFAULT (now() + interval '90 seconds')
);
GRANT SELECT ON public.site_survey_point_edit_locks TO authenticated;
GRANT ALL ON public.site_survey_point_edit_locks TO service_role;
ALTER TABLE public.site_survey_point_edit_locks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Accessible visit edit locks" ON public.site_survey_point_edit_locks FOR SELECT TO authenticated USING (public.can_view_site_survey_visit(visit_id, auth.uid()));
CREATE OR REPLACE FUNCTION public.survey_point_edit_lease(_point_id uuid, _point_kind text, _session_id uuid, _release boolean DEFAULT false, _acquire boolean DEFAULT true)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
   INSERT INTO public.site_survey_point_edit_locks(point_id, point_kind, visit_id, user_id, session_id, expires_at) VALUES (_point_id, _point_kind, v_visit, auth.uid(), _session_id, clock_timestamp() + interval '90 seconds')
   ON CONFLICT (point_id) DO UPDATE SET user_id = EXCLUDED.user_id, session_id = EXCLUDED.session_id, expires_at = EXCLUDED.expires_at
   WHERE site_survey_point_edit_locks.expires_at <= clock_timestamp() OR (site_survey_point_edit_locks.user_id = auth.uid() AND site_survey_point_edit_locks.session_id = _session_id);
  END IF;
 END IF;
 SELECT * INTO v_lock FROM public.site_survey_point_edit_locks WHERE point_id = _point_id AND expires_at > clock_timestamp();
 SELECT full_name INTO v_name FROM public.profiles WHERE id = v_lock.user_id;
 RETURN jsonb_build_object('editable', v_lock.user_id = auth.uid() AND v_lock.session_id = _session_id, 'editor', COALESCE(NULLIF(v_name, ''), 'Outro usuário'), 'occupied', v_lock.point_id IS NOT NULL);
END;
$$;
REVOKE ALL ON FUNCTION public.survey_point_edit_lease(uuid,text,uuid,boolean,boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.survey_point_edit_lease(uuid,text,uuid,boolean,boolean) TO authenticated;
CREATE OR REPLACE FUNCTION public.guard_survey_point_edit() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_row jsonb; v_id uuid; v_owner uuid; v_facade_patch boolean;
BEGIN
 v_row := CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
 IF TG_TABLE_NAME IN ('site_survey_visit_lucs','site_survey_visit_environments') THEN v_id := (v_row->>'id')::uuid;
 ELSE v_id := COALESCE((v_row->>'visit_luc_id')::uuid, (v_row->>'visit_environment_id')::uuid); END IF;
 IF v_id IS NULL THEN RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(v_id::text, 4107));
 IF TG_TABLE_NAME = 'site_survey_attachments' AND TG_OP = 'INSERT' AND v_row->>'attachment_kind' = 'facade' THEN RETURN NEW; END IF;
 v_facade_patch := TG_TABLE_NAME IN ('site_survey_visit_lucs','site_survey_visit_environments') AND TG_OP = 'UPDATE' AND pg_trigger_depth() > 1 AND current_setting('app.survey_facade_patch', true) = v_id::text;
 SELECT user_id INTO v_owner FROM public.site_survey_point_edit_locks WHERE point_id = v_id AND expires_at > clock_timestamp();
 IF auth.uid() IS NOT NULL AND v_owner IS NOT NULL AND v_owner <> auth.uid() AND NOT v_facade_patch THEN
  RAISE EXCEPTION 'Esta loja ou ambiente está sendo editado por outro usuário. Somente a foto da fachada pode ser salva.' USING ERRCODE = '42501';
 END IF;
 IF TG_TABLE_NAME IN ('site_survey_visit_lucs','site_survey_visit_environments') AND TG_OP = 'UPDATE' AND EXISTS (SELECT 1 FROM public.site_survey_attachments WHERE COALESCE(visit_luc_id, visit_environment_id) = v_id AND attachment_kind = 'facade') THEN
  NEW.pending_fields := COALESCE((SELECT jsonb_agg(value) FROM jsonb_array_elements(COALESCE(NEW.pending_fields, '[]'::jsonb)) WHERE value <> '"Foto da fachada"'::jsonb), '[]'::jsonb);
 END IF;
 RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['site_survey_visit_lucs','site_survey_visit_environments','site_survey_responses','site_survey_visit_materials','site_survey_material_decisions','site_survey_visit_technicians','site_survey_point_pauses','site_survey_generated_calls','site_survey_attachments'] LOOP
  EXECUTE format('CREATE TRIGGER guard_exclusive_point_edit BEFORE INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.guard_survey_point_edit()', t);
 END LOOP;
END $$;
CREATE OR REPLACE FUNCTION public.survey_facade_saved() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid;
BEGIN
 IF NEW.attachment_kind <> 'facade' THEN RETURN NEW; END IF;
 v_id := COALESCE(NEW.visit_luc_id, NEW.visit_environment_id);
 IF v_id IS NULL THEN RETURN NEW; END IF;
 PERFORM set_config('app.survey_facade_patch', v_id::text, true);
 IF NEW.visit_luc_id IS NOT NULL THEN
  UPDATE public.site_survey_visit_lucs SET pending_fields = COALESCE((SELECT jsonb_agg(value) FROM jsonb_array_elements(COALESCE(pending_fields, '[]'::jsonb)) WHERE value <> '"Foto da fachada"'::jsonb), '[]'::jsonb), started_at = COALESCE(started_at, now()), started_by = COALESCE(started_by, NEW.uploaded_by) WHERE id = v_id;
 ELSE
  UPDATE public.site_survey_visit_environments SET pending_fields = COALESCE((SELECT jsonb_agg(value) FROM jsonb_array_elements(COALESCE(pending_fields, '[]'::jsonb)) WHERE value <> '"Foto da fachada"'::jsonb), '[]'::jsonb), started_at = COALESCE(started_at, now()), started_by = COALESCE(started_by, NEW.uploaded_by) WHERE id = v_id;
 END IF;
 PERFORM set_config('app.survey_facade_patch', '', true);
 RETURN NEW;
END;
$$;
CREATE TRIGGER survey_facade_atomic_progress AFTER INSERT ON public.site_survey_attachments FOR EACH ROW EXECUTE FUNCTION public.survey_facade_saved();