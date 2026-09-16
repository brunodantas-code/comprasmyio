CREATE OR REPLACE FUNCTION private.is_code_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, private
AS $$
  SELECT private.is_erp_admin(_user_id)
    AND private.has_app_access(_user_id, 'development');
$$;

REVOKE ALL ON FUNCTION private.is_code_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.is_code_admin(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.validate_development_ticket_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  actor_id uuid := auth.uid();
  actor_is_code_admin boolean;
  actor_is_reporter boolean;
BEGIN
  IF actor_id IS NULL THEN
    RETURN NEW;
  END IF;

  actor_is_code_admin := private.is_code_admin(actor_id);
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

  IF NEW.assignee_id IS NOT NULL AND NOT private.is_code_admin(NEW.assignee_id) THEN
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

  IF actor_is_code_admin THEN
    IF OLD.status = 'concluido' AND NEW.status IS DISTINCT FROM OLD.status THEN
      RAISE EXCEPTION 'Tickets concluídos não podem ser reabertos.';
    END IF;
    IF NEW.status = 'concluido' AND NEW.status IS DISTINCT FROM OLD.status THEN
      RAISE EXCEPTION 'Somente o solicitante pode concluir um ticket atendido.';
    END IF;
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Somente Admins com acesso ao Code podem gerenciar o atendimento; o solicitante pode apenas concluir um ticket atendido.';
END;
$$;

DROP POLICY "Admins and reporters can update development tickets" ON public.development_tickets;
CREATE POLICY "Code admins and reporters can update development tickets"
ON public.development_tickets FOR UPDATE TO authenticated
USING (private.is_code_admin(auth.uid()) OR reporter_id = auth.uid())
WITH CHECK (private.is_code_admin(auth.uid()) OR reporter_id = auth.uid());