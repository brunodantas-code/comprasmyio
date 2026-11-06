CREATE TABLE public.project_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  position integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.project_types TO authenticated;
GRANT ALL ON public.project_types TO service_role;
ALTER TABLE public.project_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "project types readable" ON public.project_types FOR SELECT TO authenticated USING (true);
CREATE POLICY "project types insert" ON public.project_types FOR INSERT TO authenticated WITH CHECK (public.can_manage_request_subtypes(auth.uid()) AND created_by = auth.uid());
CREATE POLICY "project types update" ON public.project_types FOR UPDATE TO authenticated USING (public.can_manage_request_subtypes(auth.uid())) WITH CHECK (public.can_manage_request_subtypes(auth.uid()));
INSERT INTO public.project_types (name, position) VALUES
 ('Implantação',1),('Manutenção',2),('PoC',3),('Desenvolvimento de Software',4),('Desenvolvimento de Dispositivo',5),('Desenvolvimento de Solução',6),('Outros',7);
ALTER TABLE public.projects ADD COLUMN project_type text, ADD COLUMN short_name text;