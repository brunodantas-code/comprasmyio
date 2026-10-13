CREATE TABLE public.site_survey_report_texts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 name text NOT NULL,
 question_id uuid NOT NULL REFERENCES public.site_survey_questions(id),
 answer_value text NOT NULL DEFAULT '',
 report_question text NOT NULL DEFAULT '',
 report_answer text NOT NULL DEFAULT '',
 created_by uuid NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(question_id, answer_value)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_survey_report_texts TO authenticated;
GRANT ALL ON public.site_survey_report_texts TO service_role;
ALTER TABLE public.site_survey_report_texts ENABLE ROW LEVEL SECURITY;
CREATE POLICY report_texts_read ON public.site_survey_report_texts FOR SELECT TO authenticated USING (public.has_site_survey_permission(auth.uid(), 'site_survey_visitas_minhas') OR public.has_site_survey_permission(auth.uid(), 'site_survey_visitas_todas') OR public.has_site_survey_permission(auth.uid(), 'site_survey_configuracoes') OR public.has_site_survey_permission(auth.uid(), 'site_survey_cadastro'));
CREATE POLICY report_texts_insert ON public.site_survey_report_texts FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid() AND public.has_site_survey_permission(auth.uid(), 'site_survey_cadastro'));
CREATE POLICY report_texts_update ON public.site_survey_report_texts FOR UPDATE TO authenticated USING (public.has_site_survey_permission(auth.uid(), 'site_survey_cadastro')) WITH CHECK (public.has_site_survey_permission(auth.uid(), 'site_survey_cadastro'));
CREATE POLICY report_texts_delete ON public.site_survey_report_texts FOR DELETE TO authenticated USING (public.has_site_survey_permission(auth.uid(), 'site_survey_cadastro'));