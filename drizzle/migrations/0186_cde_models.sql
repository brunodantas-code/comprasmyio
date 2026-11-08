CREATE TABLE public.cde_selected (
  group_key text NOT NULL,
  variant_key text NOT NULL,
  chosen_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (group_key, variant_key)
);
CREATE TABLE public.cde_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_key text NOT NULL,
  name text NOT NULL,
  tag text NOT NULL DEFAULT 'Button',
  variant text NOT NULL DEFAULT '',
  size text NOT NULL DEFAULT '',
  class_name text NOT NULL DEFAULT '',
  icon text NOT NULL DEFAULT '',
  icon_class text NOT NULL DEFAULT '',
  label text NOT NULL DEFAULT '',
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.cde_removed (
  group_key text NOT NULL,
  variant_key text NOT NULL,
  replaced_by text NOT NULL,
  removed_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (group_key, variant_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cde_selected, public.cde_models, public.cde_removed TO authenticated;
GRANT ALL ON public.cde_selected, public.cde_models, public.cde_removed TO service_role;
ALTER TABLE public.cde_selected ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cde_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cde_removed ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cde_selected read" ON public.cde_selected FOR SELECT TO authenticated USING (public.is_erp_admin(auth.uid()));
CREATE POLICY "cde_selected insert" ON public.cde_selected FOR INSERT TO authenticated WITH CHECK (public.is_erp_admin(auth.uid()) AND chosen_by = auth.uid());
CREATE POLICY "cde_selected delete" ON public.cde_selected FOR DELETE TO authenticated USING (public.is_erp_admin(auth.uid()));
CREATE POLICY "cde_models read" ON public.cde_models FOR SELECT TO authenticated USING (public.is_erp_admin(auth.uid()));
CREATE POLICY "cde_models insert" ON public.cde_models FOR INSERT TO authenticated WITH CHECK (public.is_erp_admin(auth.uid()) AND created_by = auth.uid());
CREATE POLICY "cde_models delete" ON public.cde_models FOR DELETE TO authenticated USING (public.is_erp_admin(auth.uid()));
CREATE POLICY "cde_removed read" ON public.cde_removed FOR SELECT TO authenticated USING (public.is_erp_admin(auth.uid()));
CREATE POLICY "cde_removed insert" ON public.cde_removed FOR INSERT TO authenticated WITH CHECK (public.is_erp_admin(auth.uid()) AND removed_by = auth.uid());
CREATE POLICY "cde_removed delete" ON public.cde_removed FOR DELETE TO authenticated USING (public.is_erp_admin(auth.uid()));
INSERT INTO public.cde_selected (group_key, variant_key, chosen_by) SELECT group_key, variant_key, chosen_by FROM public.cde_standards WHERE chosen_by IS NOT NULL;
COMMENT ON TABLE public.cde_standards IS 'DEPRECATED: replaced by cde_selected';