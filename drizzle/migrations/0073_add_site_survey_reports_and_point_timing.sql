ALTER TABLE public.site_survey_visit_lucs
  ADD COLUMN started_at timestamptz NULL,
  ADD COLUMN started_by uuid NULL REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.site_survey_visit_environments
  ADD COLUMN started_at timestamptz NULL,
  ADD COLUMN started_by uuid NULL REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.site_survey_attachments
  ADD COLUMN attachment_kind text NOT NULL DEFAULT 'general',
  ADD CONSTRAINT site_survey_attachments_kind_check CHECK (attachment_kind IN ('general', 'question', 'facade'));

ALTER TABLE public.site_survey_visits
  ADD COLUMN report_time_summary jsonb NULL,
  ADD COLUMN report_finalized_at timestamptz NULL;

CREATE TABLE public.site_survey_time_assumptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  question_id uuid NULL REFERENCES public.site_survey_questions(id) ON DELETE RESTRICT,
  answer_value text NULL,
  minutes integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  position integer NOT NULL DEFAULT 0,
  created_by uuid NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT site_survey_time_assumptions_name_not_blank CHECK (btrim(name) <> ''),
  CONSTRAINT site_survey_time_assumptions_minutes_positive CHECK (minutes > 0)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_survey_time_assumptions TO authenticated;
GRANT ALL ON public.site_survey_time_assumptions TO service_role;
ALTER TABLE public.site_survey_time_assumptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Site Survey time assumptions are readable by app users"
ON public.site_survey_time_assumptions FOR SELECT TO authenticated
USING (
  public.has_site_survey_permission(auth.uid(), 'site_survey_visitas_minhas')
  OR public.has_site_survey_permission(auth.uid(), 'site_survey_visitas_todas')
  OR public.has_site_survey_permission(auth.uid(), 'site_survey_configuracoes')
  OR public.has_site_survey_permission(auth.uid(), 'site_survey_cadastro')
);
CREATE POLICY "Site Survey time assumptions are managed by catalog users"
ON public.site_survey_time_assumptions FOR ALL TO authenticated
USING (
  public.has_site_survey_permission(auth.uid(), 'site_survey_configuracoes')
  OR public.has_site_survey_permission(auth.uid(), 'site_survey_cadastro')
)
WITH CHECK (
  public.has_site_survey_permission(auth.uid(), 'site_survey_configuracoes')
  OR public.has_site_survey_permission(auth.uid(), 'site_survey_cadastro')
);

CREATE INDEX site_survey_time_assumptions_question_idx ON public.site_survey_time_assumptions(question_id) WHERE active;
CREATE INDEX site_survey_attachments_facade_luc_idx ON public.site_survey_attachments(visit_luc_id) WHERE attachment_kind = 'facade';
CREATE INDEX site_survey_attachments_facade_environment_idx ON public.site_survey_attachments(visit_environment_id) WHERE attachment_kind = 'facade';

CREATE TRIGGER set_site_survey_time_assumptions_updated_at
BEFORE UPDATE ON public.site_survey_time_assumptions
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();