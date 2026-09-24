CREATE TABLE public.site_survey_material_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id uuid NOT NULL REFERENCES public.site_survey_visits(id) ON DELETE CASCADE,
  visit_luc_id uuid REFERENCES public.site_survey_visit_lucs(id) ON DELETE CASCADE,
  visit_environment_id uuid REFERENCES public.site_survey_visit_environments(id) ON DELETE CASCADE,
  no_additional_material boolean NOT NULL DEFAULT false,
  recorded_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT site_survey_material_decisions_one_scope CHECK (num_nonnulls(visit_luc_id, visit_environment_id) = 1),
  CONSTRAINT site_survey_material_decisions_luc_unique UNIQUE (visit_id, visit_luc_id),
  CONSTRAINT site_survey_material_decisions_environment_unique UNIQUE (visit_id, visit_environment_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_survey_material_decisions TO authenticated;
GRANT ALL ON public.site_survey_material_decisions TO service_role;

ALTER TABLE public.site_survey_material_decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Site Survey authenticated users can read material decisions"
ON public.site_survey_material_decisions FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Site Survey authenticated users can insert material decisions"
ON public.site_survey_material_decisions FOR INSERT TO authenticated
WITH CHECK (recorded_by = auth.uid());

CREATE POLICY "Site Survey authenticated users can update material decisions"
ON public.site_survey_material_decisions FOR UPDATE TO authenticated
USING (true) WITH CHECK (recorded_by = auth.uid());

CREATE POLICY "Site Survey authenticated users can delete material decisions"
ON public.site_survey_material_decisions FOR DELETE TO authenticated
USING (true);

CREATE INDEX site_survey_material_decisions_visit_idx ON public.site_survey_material_decisions(visit_id);