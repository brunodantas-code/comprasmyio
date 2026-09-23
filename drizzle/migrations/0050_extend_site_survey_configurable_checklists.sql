ALTER TABLE public.site_survey_templates
  ADD COLUMN IF NOT EXISTS client_category_id uuid REFERENCES public.client_categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_default boolean NOT NULL DEFAULT false;

ALTER TABLE public.site_survey_sections
  ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;

ALTER TABLE public.site_survey_questions
  ADD COLUMN IF NOT EXISTS question_key text,
  ADD COLUMN IF NOT EXISTS configuration jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.site_survey_responses
  ADD COLUMN IF NOT EXISTS question_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS site_survey_questions_key_unique
  ON public.site_survey_questions(question_key)
  WHERE question_key IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS site_survey_default_category_unique
  ON public.site_survey_templates(client_category_id)
  WHERE is_default AND active AND client_category_id IS NOT NULL;

ALTER TABLE public.site_survey_questions
  DROP CONSTRAINT IF EXISTS site_survey_questions_question_type_check;

ALTER TABLE public.site_survey_questions
  ADD CONSTRAINT site_survey_questions_question_type_check
  CHECK (question_type = ANY (ARRAY['checkbox'::text, 'text'::text, 'textarea'::text, 'number'::text, 'select'::text, 'radio'::text, 'multiselect'::text]));

COMMENT ON COLUMN public.site_survey_questions.configuration IS 'Editable conditional rules, detail fields and photo requirements for guided checklists.';
COMMENT ON COLUMN public.site_survey_responses.question_snapshot IS 'Immutable copy of the question label, options and configuration used when answered.';