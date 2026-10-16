CREATE TABLE public.site_survey_installation_approvals (
 visit_id uuid NOT NULL REFERENCES public.site_survey_visits(id) ON DELETE CASCADE,
 point_kind text NOT NULL CHECK (point_kind IN ('luc','environment')),
 point_id uuid NOT NULL,
 hydraulic_approved boolean NOT NULL DEFAULT false,
 electrical_approved boolean NOT NULL DEFAULT false,
 updated_by uuid,
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (visit_id,point_kind,point_id)
);
GRANT SELECT,INSERT,UPDATE ON public.site_survey_installation_approvals TO authenticated;
GRANT ALL ON public.site_survey_installation_approvals TO service_role;
ALTER TABLE public.site_survey_installation_approvals ENABLE ROW LEVEL SECURITY;
CREATE POLICY installation_approvals_read ON public.site_survey_installation_approvals FOR SELECT TO authenticated USING (public.can_view_site_survey_visit(visit_id,auth.uid()));
CREATE POLICY installation_approvals_insert ON public.site_survey_installation_approvals FOR INSERT TO authenticated WITH CHECK (public.can_view_site_survey_visit(visit_id,auth.uid()) AND public.has_site_survey_permission(auth.uid(),'site_survey_editar'));
CREATE POLICY installation_approvals_update ON public.site_survey_installation_approvals FOR UPDATE TO authenticated USING (public.can_view_site_survey_visit(visit_id,auth.uid()) AND public.has_site_survey_permission(auth.uid(),'site_survey_editar')) WITH CHECK (public.can_view_site_survey_visit(visit_id,auth.uid()) AND public.has_site_survey_permission(auth.uid(),'site_survey_editar'));
CREATE TABLE public.site_survey_contracted_scope (
 visit_id uuid PRIMARY KEY REFERENCES public.site_survey_visits(id) ON DELETE CASCADE,
 hydraulic_shops integer CHECK (hydraulic_shops >= 0),
 hydraulic_general integer CHECK (hydraulic_general >= 0),
 electrical integer CHECK (electrical >= 0),
 updated_by uuid,
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT,INSERT,UPDATE ON public.site_survey_contracted_scope TO authenticated;
GRANT ALL ON public.site_survey_contracted_scope TO service_role;
ALTER TABLE public.site_survey_contracted_scope ENABLE ROW LEVEL SECURITY;
CREATE POLICY contracted_scope_read ON public.site_survey_contracted_scope FOR SELECT TO authenticated USING (public.can_view_site_survey_visit(visit_id,auth.uid()));
CREATE POLICY contracted_scope_insert ON public.site_survey_contracted_scope FOR INSERT TO authenticated WITH CHECK (public.can_view_site_survey_visit(visit_id,auth.uid()) AND public.has_site_survey_permission(auth.uid(),'site_survey_editar'));
CREATE POLICY contracted_scope_update ON public.site_survey_contracted_scope FOR UPDATE TO authenticated USING (public.can_view_site_survey_visit(visit_id,auth.uid()) AND public.has_site_survey_permission(auth.uid(),'site_survey_editar')) WITH CHECK (public.can_view_site_survey_visit(visit_id,auth.uid()) AND public.has_site_survey_permission(auth.uid(),'site_survey_editar'));
CREATE FUNCTION public.validate_site_survey_installation_scope() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF auth.uid() IS NOT NULL AND (NOT public.can_view_site_survey_visit(NEW.visit_id,auth.uid()) OR NOT public.has_site_survey_permission(auth.uid(),'site_survey_editar')) THEN RAISE EXCEPTION 'Sem permissão para aprovar instalações.'; END IF;
 IF TG_TABLE_NAME='site_survey_installation_approvals' THEN
  IF NEW.point_kind='luc' THEN
   IF NOT EXISTS(SELECT 1 FROM public.site_survey_visit_lucs WHERE id=NEW.point_id AND visit_id=NEW.visit_id AND active) THEN RAISE EXCEPTION 'Ponto não pertence a esta visita ou está inativo.'; END IF;
  ELSE
   IF NOT EXISTS(SELECT 1 FROM public.site_survey_visit_environments WHERE id=NEW.point_id AND visit_id=NEW.visit_id AND active) THEN RAISE EXCEPTION 'Ponto não pertence a esta visita ou está inativo.'; END IF;
  END IF;
 END IF;
 NEW.updated_by=auth.uid(); NEW.updated_at=now(); RETURN NEW;
END $$;
CREATE FUNCTION public.log_site_survey_installation_scope() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 INSERT INTO public.site_survey_logs(visit_id,actor_id,action,details) VALUES(NEW.visit_id,auth.uid(),CASE WHEN TG_TABLE_NAME='site_survey_installation_approvals' THEN 'installation_approval_changed' ELSE 'contracted_scope_changed' END,jsonb_build_object('before',CASE WHEN TG_OP='UPDATE' THEN to_jsonb(OLD) ELSE NULL END,'after',to_jsonb(NEW)));
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.validate_site_survey_installation_scope() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.log_site_survey_installation_scope() FROM PUBLIC;
CREATE TRIGGER validate_installation_scope BEFORE INSERT OR UPDATE ON public.site_survey_installation_approvals FOR EACH ROW EXECUTE FUNCTION public.validate_site_survey_installation_scope();
CREATE TRIGGER log_installation_scope AFTER INSERT OR UPDATE ON public.site_survey_installation_approvals FOR EACH ROW EXECUTE FUNCTION public.log_site_survey_installation_scope();
CREATE TRIGGER validate_contracted_scope BEFORE INSERT OR UPDATE ON public.site_survey_contracted_scope FOR EACH ROW EXECUTE FUNCTION public.validate_site_survey_installation_scope();
CREATE TRIGGER log_contracted_scope AFTER INSERT OR UPDATE ON public.site_survey_contracted_scope FOR EACH ROW EXECUTE FUNCTION public.log_site_survey_installation_scope();