ALTER TABLE public.internal_calls
  DROP CONSTRAINT IF EXISTS internal_calls_status_check;

ALTER TABLE public.internal_calls
  ADD CONSTRAINT internal_calls_status_check
  CHECK (status = ANY (ARRAY['aberto'::text, 'em_atendimento'::text, 'aguardando'::text, 'resolvido'::text, 'concluido'::text, 'cancelado'::text]));

CREATE OR REPLACE FUNCTION public.validate_internal_call_status_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'concluido' THEN
    IF auth.uid() IS DISTINCT FROM OLD.reporter_id OR OLD.status <> 'resolvido' THEN
      RAISE EXCEPTION 'Somente o solicitante pode concluir um chamado atendido';
    END IF;
    RETURN NEW;
  END IF;

  IF public.is_erp_admin(auth.uid()) OR public.is_customer_support_analyst(auth.uid()) THEN
    IF NEW.status NOT IN ('aberto', 'em_atendimento', 'aguardando', 'resolvido', 'cancelado') THEN
      RAISE EXCEPTION 'Situação inválida para o suporte';
    END IF;
    RETURN NEW;
  END IF;

  IF auth.uid() = OLD.reporter_id AND OLD.status = 'aberto' AND NEW.status = 'cancelado' THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Você não tem permissão para alterar a situação deste chamado';
END;
$$;

DROP TRIGGER IF EXISTS validate_internal_call_status_transition_trigger ON public.internal_calls;
CREATE TRIGGER validate_internal_call_status_transition_trigger
BEFORE UPDATE OF status ON public.internal_calls
FOR EACH ROW
EXECUTE FUNCTION public.validate_internal_call_status_transition();