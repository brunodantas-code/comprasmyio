ALTER TABLE public.indicadores_import_records
  ADD COLUMN IF NOT EXISTS edits jsonb,
  ADD COLUMN IF NOT EXISTS edited_at timestamptz,
  ADD COLUMN IF NOT EXISTS edited_by uuid;

CREATE POLICY import_edit ON public.indicadores_import_records
  FOR UPDATE TO authenticated
  USING (public.indicadores_role(auth.uid()) = 'admin' AND source_table = ANY (ARRAY['dimensions','team_members','meetings']))
  WITH CHECK (public.indicadores_role(auth.uid()) = 'admin' AND source_table = ANY (ARRAY['dimensions','team_members','meetings']));