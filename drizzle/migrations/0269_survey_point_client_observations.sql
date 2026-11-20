CREATE TABLE public.site_survey_client_observations (
 visit_id uuid NOT NULL REFERENCES public.site_survey_visits(id) ON DELETE CASCADE,
 point_kind text NOT NULL CHECK (point_kind IN ('luc','environment')),
 point_id uuid NOT NULL,
 observation text NOT NULL DEFAULT '',
 updated_by uuid,
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (visit_id,point_kind,point_id)
);
GRANT SELECT,INSERT,UPDATE ON public.site_survey_client_observations TO authenticated;
GRANT ALL ON public.site_survey_client_observations TO service_role;
ALTER TABLE public.site_survey_client_observations ENABLE ROW LEVEL SECURITY;
CREATE POLICY client_observations_read ON public.site_survey_client_observations FOR SELECT TO authenticated USING (public.can_view_site_survey_visit(visit_id,auth.uid()));
CREATE POLICY client_observations_insert ON public.site_survey_client_observations FOR INSERT TO authenticated WITH CHECK (public.can_view_site_survey_visit(visit_id,auth.uid()) AND public.has_site_survey_permission(auth.uid(),'site_survey_editar'));
CREATE POLICY client_observations_update ON public.site_survey_client_observations FOR UPDATE TO authenticated USING (public.can_view_site_survey_visit(visit_id,auth.uid()) AND public.has_site_survey_permission(auth.uid(),'site_survey_editar')) WITH CHECK (public.can_view_site_survey_visit(visit_id,auth.uid()) AND public.has_site_survey_permission(auth.uid(),'site_survey_editar'));
CREATE FUNCTION public.guard_survey_client_observation() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT public.can_view_site_survey_visit(NEW.visit_id,auth.uid()) OR NOT public.has_site_survey_permission(auth.uid(),'site_survey_editar') THEN RAISE EXCEPTION 'Sem permissão para editar observações para o cliente.'; END IF;
 IF TG_OP='UPDATE' AND (NEW.visit_id,NEW.point_kind,NEW.point_id) IS DISTINCT FROM (OLD.visit_id,OLD.point_kind,OLD.point_id) THEN RAISE EXCEPTION 'Não é permitido alterar o ponto da observação.'; END IF;
 IF NEW.point_kind='luc' THEN
  IF NOT EXISTS(SELECT 1 FROM public.site_survey_visit_lucs WHERE id=NEW.point_id AND visit_id=NEW.visit_id AND active) THEN RAISE EXCEPTION 'Ponto não pertence a esta visita ou está inativo.'; END IF;
 ELSE
  IF NOT EXISTS(SELECT 1 FROM public.site_survey_visit_environments WHERE id=NEW.point_id AND visit_id=NEW.visit_id AND active) THEN RAISE EXCEPTION 'Ponto não pertence a esta visita ou está inativo.'; END IF;
 END IF;
 NEW.observation=btrim(NEW.observation); NEW.updated_by=auth.uid(); NEW.updated_at=now(); RETURN NEW;
END $$;
CREATE FUNCTION public.audit_survey_client_observation() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 INSERT INTO public.site_survey_logs(visit_id,actor_id,action,details) VALUES(NEW.visit_id,auth.uid(),'client_observation_changed',jsonb_build_object('before',CASE WHEN TG_OP='UPDATE' THEN to_jsonb(OLD) ELSE NULL END,'after',to_jsonb(NEW)));
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.guard_survey_client_observation() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.audit_survey_client_observation() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER guard_client_observation BEFORE INSERT OR UPDATE ON public.site_survey_client_observations FOR EACH ROW EXECUTE FUNCTION public.guard_survey_client_observation();
CREATE TRIGGER audit_client_observation AFTER INSERT OR UPDATE ON public.site_survey_client_observations FOR EACH ROW EXECUTE FUNCTION public.audit_survey_client_observation();