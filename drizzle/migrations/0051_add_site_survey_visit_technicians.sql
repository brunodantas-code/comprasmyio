CREATE TABLE public.site_survey_visit_technicians (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id uuid NOT NULL REFERENCES public.site_survey_visits(id) ON DELETE CASCADE,
  technician_id uuid NOT NULL REFERENCES public.profiles(id),
  mobile_phone text NOT NULL,
  recorded_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT site_survey_visit_technicians_unique UNIQUE (visit_id, technician_id),
  CONSTRAINT site_survey_visit_technicians_phone_length CHECK (char_length(mobile_phone) BETWEEN 8 AND 24)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_survey_visit_technicians TO authenticated;
GRANT ALL ON public.site_survey_visit_technicians TO service_role;
ALTER TABLE public.site_survey_visit_technicians ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view accessible visit technicians" ON public.site_survey_visit_technicians FOR SELECT TO authenticated USING (public.can_view_site_survey_visit(visit_id, auth.uid()));
CREATE POLICY "Executors can add visit technicians" ON public.site_survey_visit_technicians FOR INSERT TO authenticated WITH CHECK (public.can_view_site_survey_visit(visit_id, auth.uid()) AND public.has_site_survey_permission(auth.uid(), 'site_survey_executar') AND recorded_by = auth.uid());
CREATE POLICY "Executors can update visit technicians" ON public.site_survey_visit_technicians FOR UPDATE TO authenticated USING (public.can_view_site_survey_visit(visit_id, auth.uid()) AND public.has_site_survey_permission(auth.uid(), 'site_survey_executar')) WITH CHECK (public.can_view_site_survey_visit(visit_id, auth.uid()) AND public.has_site_survey_permission(auth.uid(), 'site_survey_executar'));
CREATE POLICY "Editors can delete visit technicians" ON public.site_survey_visit_technicians FOR DELETE TO authenticated USING (public.can_view_site_survey_visit(visit_id, auth.uid()) AND (public.has_site_survey_permission(auth.uid(), 'site_survey_executar') OR public.has_site_survey_permission(auth.uid(), 'site_survey_editar')));
CREATE INDEX site_survey_visit_technicians_visit_idx ON public.site_survey_visit_technicians(visit_id);
CREATE TRIGGER set_site_survey_visit_technicians_updated_at BEFORE UPDATE ON public.site_survey_visit_technicians FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();