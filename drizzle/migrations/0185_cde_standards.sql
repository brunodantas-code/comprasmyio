CREATE TABLE public.cde_standards (
  group_key text PRIMARY KEY,
  variant_key text NOT NULL,
  chosen_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cde_standards TO authenticated;
GRANT ALL ON public.cde_standards TO service_role;
ALTER TABLE public.cde_standards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cde read admins" ON public.cde_standards FOR SELECT TO authenticated USING (public.is_erp_admin(auth.uid()));
CREATE POLICY "cde insert admins" ON public.cde_standards FOR INSERT TO authenticated WITH CHECK (public.is_erp_admin(auth.uid()) AND chosen_by = auth.uid());
CREATE POLICY "cde update admins" ON public.cde_standards FOR UPDATE TO authenticated USING (public.is_erp_admin(auth.uid())) WITH CHECK (public.is_erp_admin(auth.uid()) AND chosen_by = auth.uid());
CREATE POLICY "cde delete admins" ON public.cde_standards FOR DELETE TO authenticated USING (public.is_erp_admin(auth.uid()));