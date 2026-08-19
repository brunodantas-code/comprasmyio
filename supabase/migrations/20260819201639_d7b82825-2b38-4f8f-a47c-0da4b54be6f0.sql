CREATE TABLE public.assembly_release_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  release_id uuid NOT NULL REFERENCES public.assembly_releases(id) ON DELETE CASCADE,
  item_id uuid REFERENCES public.assembly_release_items(id) ON DELETE CASCADE,
  material_id uuid REFERENCES public.materials(id) ON DELETE SET NULL,
  reported_quantity integer,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'aberta',
  resolution_note text,
  reported_by uuid REFERENCES auth.users(id),
  resolved_by uuid REFERENCES auth.users(id),
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.assembly_release_issues TO authenticated;
GRANT ALL ON public.assembly_release_issues TO service_role;

ALTER TABLE public.assembly_release_issues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "issues_select_auth" ON public.assembly_release_issues
FOR SELECT TO authenticated USING (true);

CREATE POLICY "issues_insert_auth" ON public.assembly_release_issues
FOR INSERT TO authenticated WITH CHECK (auth.uid() = reported_by);

CREATE POLICY "issues_update_auth" ON public.assembly_release_issues
FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "issues_delete_admin" ON public.assembly_release_issues
FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "release_items_update_auth" ON public.assembly_release_items
FOR UPDATE TO authenticated USING (true) WITH CHECK (true);