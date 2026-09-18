CREATE OR REPLACE FUNCTION private.validate_development_ticket_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  actor_id uuid := auth.uid();
  ticket_reporter_id uuid;
  ticket_status text;
  parent_ticket_id uuid;
  parent_type text;
BEGIN
  IF actor_id IS NULL THEN
    RAISE EXCEPTION 'Sessão não encontrada.';
  END IF;

  SELECT reporter_id, status
  INTO ticket_reporter_id, ticket_status
  FROM public.development_tickets
  WHERE id = NEW.ticket_id;

  IF ticket_reporter_id IS NULL THEN
    RAISE EXCEPTION 'Ticket não encontrado.';
  END IF;

  IF ticket_status IN ('concluido', 'excluido') THEN
    RAISE EXCEPTION 'Não é possível enviar mensagens em um ticket encerrado.';
  END IF;

  NEW.author_id := actor_id;

  IF NEW.parent_message_id IS NOT NULL THEN
    IF ticket_reporter_id IS DISTINCT FROM actor_id THEN
      RAISE EXCEPTION 'Somente o solicitante pode responder à pergunta.';
    END IF;

    SELECT ticket_id, message_type
    INTO parent_ticket_id, parent_type
    FROM public.development_ticket_messages
    WHERE id = NEW.parent_message_id;

    IF parent_ticket_id IS DISTINCT FROM NEW.ticket_id OR parent_type IS DISTINCT FROM 'question' THEN
      RAISE EXCEPTION 'Pergunta inválida para este ticket.';
    END IF;

    IF EXISTS (
      SELECT 1
      FROM public.development_ticket_messages response
      WHERE response.parent_message_id = NEW.parent_message_id
    ) THEN
      RAISE EXCEPTION 'Esta pergunta já foi respondida.';
    END IF;

    NEW.message_type := 'answer';
  ELSIF private.is_code_admin(actor_id) THEN
    NEW.message_type := 'question';
  ELSE
    RAISE EXCEPTION 'Somente o Admin do Code pode registrar uma pergunta.';
  END IF;

  RETURN NEW;
END;
$$;