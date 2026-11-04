CREATE TABLE public.mytosis_flow_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  root_id uuid NOT NULL REFERENCES public.mytosis_nodes(id) ON DELETE CASCADE,
  root_title text NOT NULL,
  version integer NOT NULL,
  file_path text NOT NULL,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (root_id, version)
);
GRANT SELECT, INSERT ON public.mytosis_flow_versions TO authenticated;
GRANT ALL ON public.mytosis_flow_versions TO service_role;
ALTER TABLE public.mytosis_flow_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mytosis versions read" ON public.mytosis_flow_versions FOR SELECT TO authenticated USING (public.mytosis_role(auth.uid()) IS NOT NULL);
CREATE POLICY "mytosis versions insert" ON public.mytosis_flow_versions FOR INSERT TO authenticated WITH CHECK (public.mytosis_can_edit(auth.uid()) AND created_by = auth.uid());
CREATE POLICY "mytosis versions files read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'mytosis-versions' AND public.mytosis_role(auth.uid()) IS NOT NULL);
CREATE POLICY "mytosis versions files insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'mytosis-versions' AND public.mytosis_can_edit(auth.uid()));