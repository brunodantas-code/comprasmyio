CREATE TABLE public.request_types (
  code text PRIMARY KEY,
  name text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT request_types_name_not_blank CHECK (length(trim(name)) >= 2)
);

GRANT SELECT ON public.request_types TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.request_types TO authenticated;
GRANT ALL ON public.request_types TO service_role;

ALTER TABLE public.request_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY request_types_select
ON public.request_types
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY request_types_manage
ON public.request_types
FOR ALL
TO authenticated
USING (public.can_manage_limits(auth.uid()))
WITH CHECK (public.can_manage_limits(auth.uid()));

CREATE UNIQUE INDEX request_types_name_normalized_unique
ON public.request_types (lower(trim(name)));

CREATE TRIGGER request_types_set_updated_at
BEFORE UPDATE ON public.request_types
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.protect_request_type_code()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Tipos de Solicitação não podem ser excluídos. Desative o tipo.';
  END IF;
  IF NEW.code IS DISTINCT FROM OLD.code THEN
    RAISE EXCEPTION 'O código interno do Tipo de Solicitação não pode ser alterado.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER request_types_protect_code
BEFORE UPDATE OF code OR DELETE ON public.request_types
FOR EACH ROW EXECUTE FUNCTION public.protect_request_type_code();

INSERT INTO public.request_types (code, name, active, position)
VALUES
  ('materiais', 'Materiais', true, 1),
  ('servicos', 'Serviços', true, 2),
  ('viagens', 'Viagens', true, 3),
  ('reembolso', 'Reembolsos', true, 4),
  ('pagamento', 'Pagamento', true, 5),
  ('rh', 'Contratação de RH', true, 6),
  ('importacao', 'Importação', true, 7),
  ('dispositivos', 'Dispositivos', true, 8)
ON CONFLICT (code) DO UPDATE
SET name = EXCLUDED.name,
    position = EXCLUDED.position;

ALTER TABLE public.purchase_orders
ADD CONSTRAINT purchase_orders_request_type_fkey
FOREIGN KEY (request_type) REFERENCES public.request_types(code)
ON UPDATE RESTRICT ON DELETE RESTRICT;
