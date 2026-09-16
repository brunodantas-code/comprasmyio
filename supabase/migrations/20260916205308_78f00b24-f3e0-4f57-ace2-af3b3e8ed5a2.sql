UPDATE public.development_tickets
SET status = CASE
  WHEN status = 'em_andamento' THEN 'em_atendimento'
  WHEN status = 'cancelado' THEN 'concluido'
  ELSE status
END
WHERE status IN ('em_andamento', 'cancelado');

UPDATE public.development_ticket_logs
SET previous_status = CASE
      WHEN previous_status = 'em_andamento' THEN 'em_atendimento'
      WHEN previous_status = 'cancelado' THEN 'concluido'
      ELSE previous_status
    END,
    new_status = CASE
      WHEN new_status = 'em_andamento' THEN 'em_atendimento'
      WHEN new_status = 'cancelado' THEN 'concluido'
      ELSE new_status
    END
WHERE previous_status IN ('em_andamento', 'cancelado')
   OR new_status IN ('em_andamento', 'cancelado');

ALTER TABLE public.development_tickets
  DROP CONSTRAINT development_tickets_status_check;

ALTER TABLE public.development_tickets
  ADD CONSTRAINT development_tickets_status_check
  CHECK (status IN ('aberto', 'em_atendimento', 'atendido', 'concluido'));

DROP POLICY "ERP admins can update development tickets" ON public.development_tickets;

CREATE POLICY "Admins and reporters can update development tickets"
ON public.development_tickets FOR UPDATE TO authenticated
USING (private.is_erp_admin(auth.uid()) OR reporter_id = auth.uid())
WITH CHECK (private.is_erp_admin(auth.uid()) OR reporter_id = auth.uid());

CREATE OR REPLACE FUNCTION private.validate_development_ticket_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  actor_id uuid := auth.uid();
  actor_is_admin boolean;
  actor_is_reporter boolean;
BEGIN
  IF actor_id IS NULL THEN
    RETURN NEW;
  END IF;

  actor_is_admin := private.is_erp_admin(actor_id);
  actor_is_reporter := OLD.reporter_id = actor_id;

  IF NEW.reporter_id IS DISTINCT FROM OLD.reporter_id
     OR NEW.app_key IS DISTINCT FROM OLD.app_key
     OR NEW.ticket_type IS DISTINCT FROM OLD.ticket_type
     OR NEW.title IS DISTINCT FROM OLD.title
     OR NEW.description IS DISTINCT FROM OLD.description
     OR NEW.priority IS DISTINCT FROM OLD.priority
     OR NEW.urgency IS DISTINCT FROM OLD.urgency
     OR NEW.expected_result IS DISTINCT FROM OLD.expected_result
     OR NEW.menu_name IS DISTINCT FROM OLD.menu_name
     OR NEW.submenu_name IS DISTINCT FROM OLD.submenu_name THEN
    RAISE EXCEPTION 'Os dados originais do ticket não podem ser alterados.';
  END IF;

  IF NEW.assignee_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.erp_admins admin_user
    JOIN public.user_app_access app_access
      ON app_access.user_id = admin_user.user_id
     AND app_access.app_key = 'development'
    WHERE admin_user.user_id = NEW.assignee_id
  ) THEN
    RAISE EXCEPTION 'O responsável deve ser um Admin com acesso ativo ao Code.';
  END IF;

  IF NEW.status = 'concluido' AND OLD.status IS DISTINCT FROM 'concluido' THEN
    IF NOT actor_is_reporter OR OLD.status <> 'atendido' THEN
      RAISE EXCEPTION 'Somente o solicitante pode concluir um ticket atendido.';
    END IF;
    IF NEW.assignee_id IS DISTINCT FROM OLD.assignee_id
       OR NEW.admin_notes IS DISTINCT FROM OLD.admin_notes THEN
      RAISE EXCEPTION 'A conclusão pelo solicitante não pode alterar a gestão do ticket.';
    END IF;
    RETURN NEW;
  END IF;

  IF actor_is_admin THEN
    IF OLD.status = 'concluido' AND NEW.status IS DISTINCT FROM OLD.status THEN
      RAISE EXCEPTION 'Tickets concluídos não podem ser reabertos.';
    END IF;
    IF NEW.status = 'concluido' AND NEW.status IS DISTINCT FROM OLD.status THEN
      RAISE EXCEPTION 'Somente o solicitante pode concluir um ticket atendido.';
    END IF;
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Somente Admins podem gerenciar o atendimento; o solicitante pode apenas concluir um ticket atendido.';
END;
$$;

REVOKE ALL ON FUNCTION private.validate_development_ticket_update() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.validate_development_ticket_update() TO service_role;

CREATE TRIGGER development_ticket_validate_update
BEFORE UPDATE ON public.development_tickets
FOR EACH ROW EXECUTE FUNCTION private.validate_development_ticket_update();