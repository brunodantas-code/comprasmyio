CREATE TABLE public.job_titles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  description text,
  active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.job_titles TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.job_titles TO authenticated;
GRANT ALL ON public.job_titles TO service_role;

ALTER TABLE public.job_titles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view job titles"
  ON public.job_titles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage job titles"
  ON public.job_titles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_job_titles_updated_at BEFORE UPDATE ON public.job_titles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.job_titles (name) VALUES
  ('Analista'), ('Assistente'), ('Estagiário'), ('Técnico de Campo'),
  ('Engenheiro'), ('Desenvolvedor'), ('Coordenador'), ('Gerente'), ('Diretor')
ON CONFLICT (name) DO NOTHING;