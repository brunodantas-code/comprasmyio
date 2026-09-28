CREATE TABLE public.site_survey_pause_reasons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  active boolean NOT NULL DEFAULT true,
  position integer NOT NULL DEFAULT 0,
  created_by uuid NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT site_survey_pause_reasons_name_not_blank CHECK (btrim(name) <> '')
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_survey_pause_reasons TO authenticated;
GRANT ALL ON public.site_survey_pause_reasons TO service_role;
ALTER TABLE public.site_survey_pause_reasons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "App users read pause reasons" ON public.site_survey_pause_reasons FOR SELECT TO authenticated USING (
  public.has_site_survey_permission(auth.uid(), 'site_survey_visitas_minhas') OR public.has_site_survey_permission(auth.uid(), 'site_survey_visitas_todas') OR public.has_site_survey_permission(auth.uid(), 'site_survey_executar') OR public.has_site_survey_permission(auth.uid(), 'site_survey_cadastro')
);
CREATE POLICY "Catalog managers edit pause reasons" ON public.site_survey_pause_reasons FOR ALL TO authenticated USING (public.has_site_survey_permission(auth.uid(), 'site_survey_cadastro')) WITH CHECK (public.has_site_survey_permission(auth.uid(), 'site_survey_cadastro'));

CREATE TABLE public.site_survey_point_pauses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id uuid NOT NULL REFERENCES public.site_survey_visits(id) ON DELETE CASCADE,
  visit_luc_id uuid NULL REFERENCES public.site_survey_visit_lucs(id) ON DELETE CASCADE,
  visit_environment_id uuid NULL REFERENCES public.site_survey_visit_environments(id) ON DELETE CASCADE,
  reason_id uuid NOT NULL REFERENCES public.site_survey_pause_reasons(id) ON DELETE RESTRICT,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz NULL,
  started_by uuid NOT NULL REFERENCES public.profiles(id),
  ended_by uuid NULL REFERENCES public.profiles(id),
  CONSTRAINT site_survey_pause_one_point CHECK ((visit_luc_id IS NOT NULL) <> (visit_environment_id IS NOT NULL)),
  CONSTRAINT site_survey_pause_end_after_start CHECK (ended_at IS NULL OR ended_at >= started_at)
);
GRANT SELECT, INSERT, UPDATE ON public.site_survey_point_pauses TO authenticated;
GRANT ALL ON public.site_survey_point_pauses TO service_role;
ALTER TABLE public.site_survey_point_pauses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View pauses for accessible visits" ON public.site_survey_point_pauses FOR SELECT TO authenticated USING (public.can_view_site_survey_visit(visit_id, auth.uid()));
CREATE POLICY "Executors record pauses" ON public.site_survey_point_pauses FOR INSERT TO authenticated WITH CHECK (public.can_view_site_survey_visit(visit_id, auth.uid()) AND public.has_site_survey_permission(auth.uid(), 'site_survey_executar') AND started_by = auth.uid() AND ended_at IS NULL AND ((visit_luc_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.site_survey_visit_lucs l WHERE l.id = visit_luc_id AND l.visit_id = visit_id AND l.started_at IS NOT NULL AND l.completed_at IS NULL AND l.completion_status = 'pendente')) OR (visit_environment_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.site_survey_visit_environments e WHERE e.id = visit_environment_id AND e.visit_id = visit_id AND e.started_at IS NOT NULL AND e.completed_at IS NULL AND e.completion_status = 'pendente'))) AND EXISTS (SELECT 1 FROM public.site_survey_pause_reasons r WHERE r.id = reason_id AND r.active));
CREATE POLICY "Executors end pauses" ON public.site_survey_point_pauses FOR UPDATE TO authenticated USING (public.can_view_site_survey_visit(visit_id, auth.uid()) AND public.has_site_survey_permission(auth.uid(), 'site_survey_executar')) WITH CHECK (public.can_view_site_survey_visit(visit_id, auth.uid()) AND public.has_site_survey_permission(auth.uid(), 'site_survey_executar') AND ended_at IS NOT NULL AND ended_by = auth.uid());
CREATE UNIQUE INDEX site_survey_one_open_luc_pause ON public.site_survey_point_pauses (visit_luc_id) WHERE ended_at IS NULL AND visit_luc_id IS NOT NULL;
CREATE UNIQUE INDEX site_survey_one_open_environment_pause ON public.site_survey_point_pauses (visit_environment_id) WHERE ended_at IS NULL AND visit_environment_id IS NOT NULL;
CREATE INDEX site_survey_point_pauses_visit_idx ON public.site_survey_point_pauses (visit_id);