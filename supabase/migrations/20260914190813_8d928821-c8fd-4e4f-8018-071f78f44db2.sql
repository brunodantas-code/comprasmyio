CREATE TABLE public.additional_step_types (
  code text PRIMARY KEY,
  name text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT additional_step_types_code_not_blank CHECK (btrim(code) <> ''),
  CONSTRAINT additional_step_types_name_not_blank CHECK (btrim(name) <> '')
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.additional_step_types TO authenticated;
GRANT ALL ON public.additional_step_types TO service_role;

ALTER TABLE public.additional_step_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "additional_step_types_select"
ON public.additional_step_types
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "additional_step_types_manage"
ON public.additional_step_types
FOR ALL
TO authenticated
USING (public.can_manage_limits(auth.uid()))
WITH CHECK (public.can_manage_limits(auth.uid()));

CREATE UNIQUE INDEX additional_step_types_name_unique
ON public.additional_step_types (lower(btrim(name)));

CREATE TRIGGER additional_step_types_set_updated_at
BEFORE UPDATE ON public.additional_step_types
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.additional_step_types (code, name, active)
VALUES
  ('validacao_tecnica', 'Validação Técnica', true),
  ('validacao_comercial', 'Validação Comercial', true),
  ('validacao_orcamentaria', 'Validação Orçamentária', true),
  ('compliance', 'Compliance', true);

ALTER TABLE public.approval_rules
ADD CONSTRAINT approval_rules_step_type_fkey
FOREIGN KEY (step_type)
REFERENCES public.additional_step_types(code)
ON UPDATE CASCADE
ON DELETE RESTRICT;