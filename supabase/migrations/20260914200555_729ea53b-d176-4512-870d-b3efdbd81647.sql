CREATE OR REPLACE FUNCTION public.protect_request_type_code()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.is_system THEN
      RAISE EXCEPTION 'Tipos de Solicitação originais não podem ser excluídos. Desative o tipo.';
    END IF;
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