ALTER TABLE public.request_types
ADD COLUMN model_code text,
ADD COLUMN is_system boolean NOT NULL DEFAULT false;

UPDATE public.request_types
SET model_code = code,
    is_system = code IN ('materiais','servicos','viagens','reembolso','pagamento','rh','importacao','dispositivos');

ALTER TABLE public.request_types
ALTER COLUMN model_code SET NOT NULL,
ADD CONSTRAINT request_types_model_code_fkey
  FOREIGN KEY (model_code) REFERENCES public.request_types(code)
  ON UPDATE RESTRICT ON DELETE RESTRICT,
ADD CONSTRAINT request_types_model_code_allowed
  CHECK (model_code IN ('materiais','servicos','viagens','reembolso','pagamento','rh','importacao','dispositivos'));

ALTER TABLE public.purchase_orders
ADD COLUMN request_model text;

UPDATE public.purchase_orders po
SET request_model = COALESCE(rt.model_code, po.request_type)
FROM public.request_types rt
WHERE rt.code = po.request_type;

UPDATE public.purchase_orders
SET request_model = request_type
WHERE request_model IS NULL;

ALTER TABLE public.purchase_orders
ALTER COLUMN request_model SET NOT NULL,
ADD CONSTRAINT purchase_orders_request_model_fkey
  FOREIGN KEY (request_model) REFERENCES public.request_types(code)
  ON UPDATE RESTRICT ON DELETE RESTRICT;

CREATE OR REPLACE FUNCTION public.set_purchase_order_request_model()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.request_type IS DISTINCT FROM OLD.request_type THEN
    SELECT model_code INTO NEW.request_model
    FROM public.request_types
    WHERE code = NEW.request_type AND active;
    IF NEW.request_model IS NULL THEN
      RAISE EXCEPTION 'Tipo de Solicitação inválido ou inativo';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER a_set_purchase_order_request_model
BEFORE INSERT OR UPDATE OF request_type ON public.purchase_orders
FOR EACH ROW EXECUTE FUNCTION public.set_purchase_order_request_model();

DO $$
DECLARE
  fn text;
BEGIN
  SELECT pg_get_functiondef('public.build_approval_chain()'::regprocedure) INTO fn;
  fn := replace(fn, 'IF NEW.request_type = ''pagamento'' THEN', 'IF NEW.request_model = ''pagamento'' THEN');
  fn := replace(fn, 'NEW.request_type = ANY(request_types))', '(NEW.request_type = ANY(request_types) OR NEW.request_model = ANY(request_types)))');
  EXECUTE fn;

  SELECT pg_get_functiondef('public.validate_payment_order()'::regprocedure) INTO fn;
  fn := replace(fn, 'IF NEW.request_type <> ''pagamento'' THEN', 'IF NEW.request_model <> ''pagamento'' THEN');
  fn := replace(fn, 'IF original.request_type = ''pagamento'' OR original.parent_order_id IS NOT NULL THEN', 'IF original.request_model = ''pagamento'' OR original.parent_order_id IS NOT NULL THEN');
  EXECUTE fn;
END;
$$;