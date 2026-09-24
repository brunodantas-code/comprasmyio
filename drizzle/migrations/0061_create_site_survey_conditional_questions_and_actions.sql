ALTER TABLE public.site_survey_questions
  ADD COLUMN conditioned_on_question_id uuid REFERENCES public.site_survey_questions(id) ON DELETE SET NULL,
  ADD COLUMN conditioned_operator text NOT NULL DEFAULT 'equals',
  ADD COLUMN conditioned_value text;

ALTER TABLE public.site_survey_questions
  ADD CONSTRAINT site_survey_questions_condition_operator_check
  CHECK (conditioned_operator IN ('equals', 'not_equals'));

CREATE INDEX site_survey_questions_conditioned_on_idx
  ON public.site_survey_questions(conditioned_on_question_id)
  WHERE conditioned_on_question_id IS NOT NULL;

CREATE TABLE public.site_survey_action_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  active boolean NOT NULL DEFAULT true,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_survey_action_catalog TO authenticated;
GRANT ALL ON public.site_survey_action_catalog TO service_role;
ALTER TABLE public.site_survey_action_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Site Survey actions are readable by app users"
  ON public.site_survey_action_catalog FOR SELECT TO authenticated
  USING (
    public.has_site_survey_permission(auth.uid(), 'site_survey_visitas_minhas')
    OR public.has_site_survey_permission(auth.uid(), 'site_survey_visitas_todas')
    OR public.has_site_survey_permission(auth.uid(), 'site_survey_configuracoes')
    OR public.has_site_survey_permission(auth.uid(), 'site_survey_cadastro')
  );
CREATE POLICY "Site Survey actions are managed by configurators"
  ON public.site_survey_action_catalog FOR ALL TO authenticated
  USING (
    public.has_site_survey_permission(auth.uid(), 'site_survey_configuracoes')
    OR public.has_site_survey_permission(auth.uid(), 'site_survey_cadastro')
  )
  WITH CHECK (
    public.has_site_survey_permission(auth.uid(), 'site_survey_configuracoes')
    OR public.has_site_survey_permission(auth.uid(), 'site_survey_cadastro')
  );

CREATE TABLE public.site_survey_question_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES public.site_survey_questions(id) ON DELETE CASCADE,
  action_id uuid NOT NULL REFERENCES public.site_survey_action_catalog(id) ON DELETE RESTRICT,
  trigger_value text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (question_id, action_id, trigger_value)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_survey_question_actions TO authenticated;
GRANT ALL ON public.site_survey_question_actions TO service_role;
ALTER TABLE public.site_survey_question_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Site Survey question actions are readable by app users"
  ON public.site_survey_question_actions FOR SELECT TO authenticated
  USING (
    public.has_site_survey_permission(auth.uid(), 'site_survey_visitas_minhas')
    OR public.has_site_survey_permission(auth.uid(), 'site_survey_visitas_todas')
    OR public.has_site_survey_permission(auth.uid(), 'site_survey_configuracoes')
  );
CREATE POLICY "Site Survey question actions are managed by configurators"
  ON public.site_survey_question_actions FOR ALL TO authenticated
  USING (public.has_site_survey_permission(auth.uid(), 'site_survey_configuracoes'))
  WITH CHECK (public.has_site_survey_permission(auth.uid(), 'site_survey_configuracoes'));

CREATE TABLE public.site_survey_generated_calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id uuid NOT NULL REFERENCES public.site_survey_visits(id) ON DELETE CASCADE,
  question_action_id uuid NOT NULL REFERENCES public.site_survey_question_actions(id) ON DELETE RESTRICT,
  question_id uuid NOT NULL REFERENCES public.site_survey_questions(id) ON DELETE RESTRICT,
  visit_luc_id uuid REFERENCES public.site_survey_visit_lucs(id) ON DELETE CASCADE,
  visit_environment_id uuid REFERENCES public.site_survey_visit_environments(id) ON DELETE CASCADE,
  trigger_value text NOT NULL,
  status text NOT NULL DEFAULT 'aberto',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT site_survey_generated_calls_scope_check CHECK (visit_luc_id IS NULL OR visit_environment_id IS NULL),
  CONSTRAINT site_survey_generated_calls_status_check CHECK (status IN ('aberto', 'cancelado', 'concluido'))
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_survey_generated_calls TO authenticated;
GRANT ALL ON public.site_survey_generated_calls TO service_role;
ALTER TABLE public.site_survey_generated_calls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Site Survey calls are visible with visit"
  ON public.site_survey_generated_calls FOR SELECT TO authenticated
  USING (public.can_view_site_survey_visit(visit_id, auth.uid()));
CREATE POLICY "Site Survey calls can be created"
  ON public.site_survey_generated_calls FOR INSERT TO authenticated
  WITH CHECK (
    public.can_view_site_survey_visit(visit_id, auth.uid())
    AND public.has_site_survey_permission(auth.uid(), 'site_survey_executar')
    AND created_by = auth.uid()
  );
CREATE POLICY "Site Survey calls can be updated"
  ON public.site_survey_generated_calls FOR UPDATE TO authenticated
  USING (
    public.can_view_site_survey_visit(visit_id, auth.uid())
    AND public.has_site_survey_permission(auth.uid(), 'site_survey_executar')
  )
  WITH CHECK (
    public.can_view_site_survey_visit(visit_id, auth.uid())
    AND public.has_site_survey_permission(auth.uid(), 'site_survey_executar')
  );

CREATE UNIQUE INDEX site_survey_generated_calls_active_unique
  ON public.site_survey_generated_calls (
    visit_id,
    question_action_id,
    COALESCE(visit_luc_id, '00000000-0000-0000-0000-000000000000'::uuid),
    COALESCE(visit_environment_id, '00000000-0000-0000-0000-000000000000'::uuid)
  )
  WHERE status = 'aberto';

CREATE INDEX site_survey_question_actions_question_idx ON public.site_survey_question_actions(question_id);
CREATE INDEX site_survey_generated_calls_visit_idx ON public.site_survey_generated_calls(visit_id, status);

CREATE TRIGGER site_survey_action_catalog_updated_at
  BEFORE UPDATE ON public.site_survey_action_catalog
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER site_survey_question_actions_updated_at
  BEFORE UPDATE ON public.site_survey_question_actions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER site_survey_generated_calls_updated_at
  BEFORE UPDATE ON public.site_survey_generated_calls
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.site_survey_generated_calls IS 'Chamados gerados imediatamente por respostas do Site Survey, preparados para o futuro aplicativo Chamados.';