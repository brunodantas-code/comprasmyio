CREATE TABLE public.pm_assumptions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),project_id uuid NOT NULL UNIQUE REFERENCES public.pm_projects(id),survey_id uuid REFERENCES public.site_survey_visits(id),source_label text NOT NULL DEFAULT '',entries jsonb NOT NULL DEFAULT '[]'::jsonb CHECK(jsonb_typeof(entries)='array'));
GRANT SELECT,INSERT,UPDATE,DELETE ON public.pm_assumptions TO authenticated; GRANT ALL ON public.pm_assumptions TO service_role;
ALTER TABLE public.pm_assumptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY pm_assumptions_access ON public.pm_assumptions FOR ALL TO authenticated USING(public.pm_can_edit(project_id)) WITH CHECK(public.pm_can_edit(project_id));
CREATE FUNCTION public.pm_assumptions_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ DECLARE e jsonb; BEGIN
 IF EXISTS(SELECT 1 FROM public.pm_projects WHERE id=NEW.project_id AND status IN ('concluido','cancelado')) THEN RAISE EXCEPTION 'Projeto encerrado'; END IF;
 IF TG_OP='UPDATE' AND NEW.project_id<>OLD.project_id THEN RAISE EXCEPTION 'Não é permitido mover premissas entre projetos'; END IF;
 IF NEW.survey_id IS NOT NULL AND NOT public.can_view_site_survey_visit(NEW.survey_id,auth.uid()) THEN RAISE EXCEPTION 'Visita não autorizada'; END IF;
 FOR e IN SELECT value FROM jsonb_array_elements(NEW.entries) LOOP
 IF e->>'discipline' NOT IN ('electrical','hydraulic') OR e->>'difficulty' NOT IN ('low','medium','high','unknown') OR e->>'quantity' IS NULL OR (e->>'quantity')::numeric<0 OR (e->>'quantity')::numeric<>trunc((e->>'quantity')::numeric) OR (e->>'productivity') IS NOT NULL AND (e->>'productivity')::numeric<=0 THEN RAISE EXCEPTION 'Premissa inválida: use quantidades inteiras e produtividade positiva'; END IF;
 END LOOP;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(NEW.entries) e GROUP BY e->>'discipline',e->>'difficulty' HAVING count(*)>1) THEN RAISE EXCEPTION 'Premissa duplicada'; END IF;
 RETURN NEW; END $$;
REVOKE ALL ON FUNCTION public.pm_assumptions_guard() FROM PUBLIC,anon;
CREATE TRIGGER pm_assumptions_validate BEFORE INSERT OR UPDATE ON public.pm_assumptions FOR EACH ROW EXECUTE FUNCTION public.pm_assumptions_guard();
CREATE TRIGGER pm_assumptions_audit AFTER INSERT OR UPDATE OR DELETE ON public.pm_assumptions FOR EACH ROW EXECUTE FUNCTION public.pm_audit_row();