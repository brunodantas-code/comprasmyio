CREATE TABLE public.site_survey_visit_environments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id uuid NOT NULL REFERENCES public.site_survey_visits(id) ON DELETE CASCADE,
  name text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT site_survey_visit_environments_name_not_blank CHECK (btrim(name) <> ''),
  CONSTRAINT site_survey_visit_environments_visit_name_unique UNIQUE (visit_id, name)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_survey_visit_environments TO authenticated;
GRANT ALL ON public.site_survey_visit_environments TO service_role;

ALTER TABLE public.site_survey_visit_environments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view accessible visit environments"
ON public.site_survey_visit_environments FOR SELECT TO authenticated
USING (public.can_view_site_survey_visit(visit_id, auth.uid()));

CREATE POLICY "Users can add visit environments"
ON public.site_survey_visit_environments FOR INSERT TO authenticated
WITH CHECK (
  public.can_view_site_survey_visit(visit_id, auth.uid())
  AND created_by = auth.uid()
  AND (
    public.has_site_survey_permission(auth.uid(), 'site_survey_agendar')
    OR public.has_site_survey_permission(auth.uid(), 'site_survey_editar')
  )
);

CREATE POLICY "Users can update visit environments"
ON public.site_survey_visit_environments FOR UPDATE TO authenticated
USING (
  public.can_view_site_survey_visit(visit_id, auth.uid())
  AND (
    public.has_site_survey_permission(auth.uid(), 'site_survey_editar')
    OR public.has_site_survey_permission(auth.uid(), 'site_survey_executar')
  )
)
WITH CHECK (
  public.can_view_site_survey_visit(visit_id, auth.uid())
  AND (
    public.has_site_survey_permission(auth.uid(), 'site_survey_editar')
    OR public.has_site_survey_permission(auth.uid(), 'site_survey_executar')
  )
);

CREATE POLICY "Users can delete visit environments"
ON public.site_survey_visit_environments FOR DELETE TO authenticated
USING (
  public.can_view_site_survey_visit(visit_id, auth.uid())
  AND public.has_site_survey_permission(auth.uid(), 'site_survey_editar')
);

CREATE INDEX site_survey_visit_environments_visit_idx
ON public.site_survey_visit_environments (visit_id, active, name);

CREATE TRIGGER site_survey_visit_environments_updated_at
BEFORE UPDATE ON public.site_survey_visit_environments
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.site_survey_visit_environments (visit_id, name, created_by, updated_by)
SELECT v.id, btrim(environment_name), v.created_by, v.created_by
FROM public.site_survey_visits v
CROSS JOIN LATERAL jsonb_array_elements_text(COALESCE(v.environments, '[]'::jsonb)) AS environment_name
WHERE btrim(environment_name) <> ''
ON CONFLICT (visit_id, name) DO NOTHING;

ALTER TABLE public.site_survey_responses
  ADD COLUMN visit_luc_id uuid REFERENCES public.site_survey_visit_lucs(id) ON DELETE CASCADE,
  ADD COLUMN visit_environment_id uuid REFERENCES public.site_survey_visit_environments(id) ON DELETE CASCADE,
  ADD CONSTRAINT site_survey_responses_point_scope_check CHECK (visit_luc_id IS NULL OR visit_environment_id IS NULL);

ALTER TABLE public.site_survey_responses
  DROP CONSTRAINT site_survey_responses_visit_id_question_id_key;

CREATE UNIQUE INDEX site_survey_responses_unique_point_scope
ON public.site_survey_responses (
  visit_id,
  question_id,
  COALESCE(visit_luc_id, '00000000-0000-0000-0000-000000000000'::uuid),
  COALESCE(visit_environment_id, '00000000-0000-0000-0000-000000000000'::uuid)
);

ALTER TABLE public.site_survey_attachments
  ADD COLUMN visit_luc_id uuid REFERENCES public.site_survey_visit_lucs(id) ON DELETE CASCADE,
  ADD COLUMN visit_environment_id uuid REFERENCES public.site_survey_visit_environments(id) ON DELETE CASCADE,
  ADD CONSTRAINT site_survey_attachments_point_scope_check CHECK (visit_luc_id IS NULL OR visit_environment_id IS NULL);

CREATE INDEX site_survey_attachments_point_idx
ON public.site_survey_attachments (visit_id, visit_luc_id, visit_environment_id, question_id);

ALTER TABLE public.site_survey_visit_technicians
  ADD COLUMN visit_luc_id uuid REFERENCES public.site_survey_visit_lucs(id) ON DELETE CASCADE,
  ADD COLUMN visit_environment_id uuid REFERENCES public.site_survey_visit_environments(id) ON DELETE CASCADE,
  ADD CONSTRAINT site_survey_visit_technicians_point_scope_check CHECK (visit_luc_id IS NULL OR visit_environment_id IS NULL);

ALTER TABLE public.site_survey_visit_technicians
  DROP CONSTRAINT site_survey_visit_technicians_unique;

CREATE UNIQUE INDEX site_survey_visit_technicians_unique_point_scope
ON public.site_survey_visit_technicians (
  visit_id,
  technician_id,
  COALESCE(visit_luc_id, '00000000-0000-0000-0000-000000000000'::uuid),
  COALESCE(visit_environment_id, '00000000-0000-0000-0000-000000000000'::uuid)
);

ALTER TABLE public.site_survey_visit_materials
  ADD COLUMN visit_luc_id uuid REFERENCES public.site_survey_visit_lucs(id) ON DELETE CASCADE,
  ADD COLUMN visit_environment_id uuid REFERENCES public.site_survey_visit_environments(id) ON DELETE CASCADE,
  ADD CONSTRAINT site_survey_visit_materials_point_scope_check CHECK (visit_luc_id IS NULL OR visit_environment_id IS NULL);

ALTER TABLE public.site_survey_visit_materials
  DROP CONSTRAINT site_survey_visit_materials_unique;

CREATE UNIQUE INDEX site_survey_visit_materials_unique_point_scope
ON public.site_survey_visit_materials (
  visit_id,
  catalog_item_id,
  COALESCE(screwdriver_type_id, '00000000-0000-0000-0000-000000000000'::uuid),
  COALESCE(wrench_size_id, '00000000-0000-0000-0000-000000000000'::uuid),
  COALESCE(visit_luc_id, '00000000-0000-0000-0000-000000000000'::uuid),
  COALESCE(visit_environment_id, '00000000-0000-0000-0000-000000000000'::uuid)
);