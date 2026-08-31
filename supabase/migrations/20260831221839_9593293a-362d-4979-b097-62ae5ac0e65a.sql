ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS budget numeric(14,2) NOT NULL DEFAULT 0;
ALTER TABLE public.projects ADD CONSTRAINT projects_budget_non_negative CHECK (budget >= 0);

DROP POLICY IF EXISTS "Admins manage projects" ON public.projects;
DROP POLICY IF EXISTS "Admins can insert projects" ON public.projects;
DROP POLICY IF EXISTS "projects_insert_admin" ON public.projects;

CREATE POLICY "Only executives can create projects"
ON public.projects FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'ceo')
  OR public.has_role(auth.uid(), 'coo')
  OR public.has_role(auth.uid(), 'cfo')
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Executives can update projects"
ON public.projects FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'ceo')
  OR public.has_role(auth.uid(), 'coo')
  OR public.has_role(auth.uid(), 'cfo')
  OR public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
  public.has_role(auth.uid(), 'ceo')
  OR public.has_role(auth.uid(), 'coo')
  OR public.has_role(auth.uid(), 'cfo')
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Executives can delete projects"
ON public.projects FOR DELETE TO authenticated
USING (
  public.has_role(auth.uid(), 'ceo')
  OR public.has_role(auth.uid(), 'coo')
  OR public.has_role(auth.uid(), 'cfo')
  OR public.has_role(auth.uid(), 'admin')
);