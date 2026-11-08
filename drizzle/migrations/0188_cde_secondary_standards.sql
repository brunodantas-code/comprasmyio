ALTER TABLE public.cde_selected ADD COLUMN IF NOT EXISTS is_primary boolean NOT NULL DEFAULT true, ADD COLUMN IF NOT EXISTS screens text[] NOT NULL DEFAULT '{}';
GRANT UPDATE ON public.cde_selected TO authenticated;
CREATE POLICY "cde_selected update" ON public.cde_selected FOR UPDATE TO authenticated USING (public.is_erp_admin(auth.uid())) WITH CHECK (public.is_erp_admin(auth.uid()));