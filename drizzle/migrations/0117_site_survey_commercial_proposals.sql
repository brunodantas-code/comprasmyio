CREATE TABLE public.site_survey_commercial_proposals (
 visit_id uuid PRIMARY KEY REFERENCES public.site_survey_visits(id) ON DELETE CASCADE,
 storage_path text NOT NULL UNIQUE,
 file_name text NOT NULL,
 file_size bigint NOT NULL CHECK (file_size > 0),
 uploaded_by uuid NOT NULL,
 updated_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT proposal_path_matches_visit CHECK (split_part(storage_path, '/', 1) = visit_id::text)
);
GRANT SELECT, INSERT, UPDATE ON public.site_survey_commercial_proposals TO authenticated;
GRANT ALL ON public.site_survey_commercial_proposals TO service_role;
ALTER TABLE public.site_survey_commercial_proposals ENABLE ROW LEVEL SECURITY;
CREATE POLICY proposal_read ON public.site_survey_commercial_proposals FOR SELECT TO authenticated USING (public.can_view_site_survey_visit(visit_id, auth.uid()));
CREATE POLICY proposal_insert ON public.site_survey_commercial_proposals FOR INSERT TO authenticated WITH CHECK (public.can_view_site_survey_visit(visit_id, auth.uid()) AND uploaded_by = auth.uid() AND (public.has_site_survey_permission(auth.uid(), 'site_survey_editar') OR public.has_site_survey_permission(auth.uid(), 'site_survey_agendar')));
CREATE POLICY proposal_update ON public.site_survey_commercial_proposals FOR UPDATE TO authenticated USING (public.can_view_site_survey_visit(visit_id, auth.uid()) AND (public.has_site_survey_permission(auth.uid(), 'site_survey_editar') OR public.has_site_survey_permission(auth.uid(), 'site_survey_agendar'))) WITH CHECK (public.can_view_site_survey_visit(visit_id, auth.uid()) AND uploaded_by = auth.uid() AND (public.has_site_survey_permission(auth.uid(), 'site_survey_editar') OR public.has_site_survey_permission(auth.uid(), 'site_survey_agendar')));
CREATE POLICY proposal_file_read ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'site-survey-proposals' AND split_part(name, '/', 1) ~ '^[0-9a-f-]{36}$' AND public.can_view_site_survey_visit(split_part(name, '/', 1)::uuid, auth.uid()));
CREATE POLICY proposal_file_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'site-survey-proposals' AND owner_id = auth.uid()::text AND split_part(name, '/', 1) ~ '^[0-9a-f-]{36}$' AND public.can_view_site_survey_visit(split_part(name, '/', 1)::uuid, auth.uid()) AND (public.has_site_survey_permission(auth.uid(), 'site_survey_editar') OR public.has_site_survey_permission(auth.uid(), 'site_survey_agendar')));
CREATE POLICY proposal_file_delete ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'site-survey-proposals' AND split_part(name, '/', 1) ~ '^[0-9a-f-]{36}$' AND public.can_view_site_survey_visit(split_part(name, '/', 1)::uuid, auth.uid()) AND (public.has_site_survey_permission(auth.uid(), 'site_survey_editar') OR public.has_site_survey_permission(auth.uid(), 'site_survey_agendar')) AND NOT EXISTS (SELECT 1 FROM public.site_survey_commercial_proposals p WHERE p.storage_path = name));