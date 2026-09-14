ALTER TABLE public.purchase_orders DROP CONSTRAINT IF EXISTS purchase_orders_request_model_fkey;
ALTER TABLE public.request_types DROP CONSTRAINT IF EXISTS request_types_model_code_fkey;

CREATE OR REPLACE FUNCTION public.protect_request_type_code()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  IF NEW.code IS DISTINCT FROM OLD.code THEN
    RAISE EXCEPTION 'O código interno do Tipo de Solicitação não pode ser alterado.';
  END IF;
  IF OLD.is_system AND NEW.model_code IS DISTINCT FROM OLD.model_code THEN
    RAISE EXCEPTION 'O modelo de um Tipo de Solicitação original não pode ser alterado.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE POLICY request_types_insert
ON public.request_types
FOR INSERT
TO authenticated
WITH CHECK (public.can_manage_limits(auth.uid()));

CREATE POLICY request_types_delete
ON public.request_types
FOR DELETE
TO authenticated
USING (public.can_manage_limits(auth.uid()));