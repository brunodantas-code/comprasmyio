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

  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.ticket_number IS DISTINCT FROM OLD.ticket_number
     OR NEW.reporter_id IS DISTINCT FROM OLD.reporter_id
     OR NEW.app_key IS DISTINCT FROM OLD.app_key
     OR NEW.ticket_type IS DISTINCT FROM OLD.ticket_type
     OR NEW.title IS DISTINCT FROM OLD.title
     OR NEW.description IS DISTINCT FROM OLD.description
     OR NEW.priority IS DISTINCT FROM OLD.priority
     OR NEW.urgency IS DISTINCT FROM OLD.urgency
     OR NEW.expected_result IS DISTINCT FROM OLD.expected_result
     OR NEW.menu_name IS DISTINCT FROM OLD.menu_name
     OR NEW.submenu_name IS DISTINCT FROM OLD.submenu_name
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
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

DROP POLICY "Related users can view development tickets" ON public.development_tickets;
CREATE POLICY "Related users can view development tickets"
ON public.development_tickets FOR SELECT TO authenticated
USING (reporter_id = auth.uid() OR assignee_id = auth.uid() OR private.is_code_admin(auth.uid()));

DROP POLICY "Related users can view development ticket logs" ON public.development_ticket_logs;
CREATE POLICY "Related users can view development ticket logs"
ON public.development_ticket_logs FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.development_tickets ticket
  WHERE ticket.id = ticket_id
    AND (ticket.reporter_id = auth.uid() OR ticket.assignee_id = auth.uid() OR private.is_code_admin(auth.uid()))
));

DROP POLICY "Related users can view development attachments" ON public.development_ticket_attachments;
CREATE POLICY "Related users can view development attachments"
ON public.development_ticket_attachments FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.development_tickets ticket
  WHERE ticket.id = ticket_id
    AND (ticket.reporter_id = auth.uid() OR ticket.assignee_id = auth.uid() OR private.is_code_admin(auth.uid()))
));

DROP POLICY "Ticket authors can add development attachments" ON public.development_ticket_attachments;
CREATE POLICY "Ticket authors can add development attachments"
ON public.development_ticket_attachments FOR INSERT TO authenticated
WITH CHECK (
  uploaded_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.development_tickets ticket
    WHERE ticket.id = ticket_id
      AND (ticket.reporter_id = auth.uid() OR private.is_code_admin(auth.uid()))
  )
);

DROP POLICY "Uploaders and ERP admins can remove development attachments" ON public.development_ticket_attachments;
CREATE POLICY "Uploaders and Code admins can remove development attachments"
ON public.development_ticket_attachments FOR DELETE TO authenticated
USING (uploaded_by = auth.uid() OR private.is_code_admin(auth.uid()));

DROP POLICY "Related users can read development ticket files" ON storage.objects;
CREATE POLICY "Related users can read development ticket files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'development-ticket-attachments'
  AND EXISTS (
    SELECT 1 FROM public.development_tickets ticket
    WHERE ticket.id::text = (storage.foldername(name))[1]
      AND (ticket.reporter_id = auth.uid() OR ticket.assignee_id = auth.uid() OR private.is_code_admin(auth.uid()))
  )
);

DROP POLICY "Ticket authors can upload development ticket files" ON storage.objects;
CREATE POLICY "Ticket authors can upload development ticket files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'development-ticket-attachments'
  AND EXISTS (
    SELECT 1 FROM public.development_tickets ticket
    WHERE ticket.id::text = (storage.foldername(name))[1]
      AND (ticket.reporter_id = auth.uid() OR private.is_code_admin(auth.uid()))
  )
);

DROP POLICY "Ticket authors can remove development ticket files" ON storage.objects;
CREATE POLICY "Ticket authors can remove development ticket files"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'development-ticket-attachments'
  AND EXISTS (
    SELECT 1 FROM public.development_tickets ticket
    WHERE ticket.id::text = (storage.foldername(name))[1]
      AND (ticket.reporter_id = auth.uid() OR private.is_code_admin(auth.uid()))
  )
);