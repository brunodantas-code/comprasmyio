CREATE TABLE public.assembly_releases (
  id uuid primary key default gen_random_uuid(),
  photo_url text not null,
  responsibles uuid[] not null default '{}',
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assembly_releases TO authenticated;
GRANT ALL ON public.assembly_releases TO service_role;
ALTER TABLE public.assembly_releases ENABLE ROW LEVEL SECURITY;
CREATE POLICY assembly_releases_select_auth ON public.assembly_releases FOR SELECT TO authenticated USING (true);
CREATE POLICY assembly_releases_insert_auth ON public.assembly_releases FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY assembly_releases_delete_admin ON public.assembly_releases FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE public.assembly_release_items (
  id uuid primary key default gen_random_uuid(),
  release_id uuid not null references public.assembly_releases(id) on delete cascade,
  material_id uuid not null references public.materials(id),
  quantity integer not null check (quantity > 0),
  created_at timestamptz not null default now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assembly_release_items TO authenticated;
GRANT ALL ON public.assembly_release_items TO service_role;
ALTER TABLE public.assembly_release_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY assembly_release_items_select_auth ON public.assembly_release_items FOR SELECT TO authenticated USING (true);
CREATE POLICY assembly_release_items_insert_auth ON public.assembly_release_items FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.assembly_releases r WHERE r.id = release_id AND r.created_by = auth.uid()));
CREATE POLICY assembly_release_items_delete_admin ON public.assembly_release_items FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "assembly photos read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'assembly-photos');
CREATE POLICY "assembly photos upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'assembly-photos');