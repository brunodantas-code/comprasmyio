CREATE TABLE public.development_ticket_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.development_tickets(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.profiles(id),
  message_type text NOT NULL CHECK (message_type IN ('question', 'answer')),
  parent_message_id uuid REFERENCES public.development_ticket_messages(id),
  message text NOT NULL CHECK (char_length(btrim(message)) BETWEEN 1 AND 4000),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT development_ticket_messages_answer_parent CHECK (
    (message_type = 'question' AND parent_message_id IS NULL)
    OR (message_type = 'answer' AND parent_message_id IS NOT NULL)
  )
);

GRANT SELECT, INSERT ON public.development_ticket_messages TO authenticated;
GRANT ALL ON public.development_ticket_messages TO service_role;

ALTER TABLE public.development_ticket_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Related users can view development ticket messages"
ON public.development_ticket_messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.development_tickets ticket
    WHERE ticket.id = ticket_id
      AND (
        ticket.reporter_id = auth.uid()
        OR private.is_code_admin(auth.uid())
      )
  )
);

CREATE POLICY "Related users can send development ticket messages"
ON public.development_ticket_messages
FOR INSERT
TO authenticated
WITH CHECK (
  author_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.development_tickets ticket
    WHERE ticket.id = ticket_id
      AND ticket.status NOT IN ('concluido', 'excluido')
      AND (
        ticket.reporter_id = auth.uid()
        OR private.is_code_admin(auth.uid())
      )
  )
);

CREATE UNIQUE INDEX development_ticket_messages_one_answer_idx
ON public.development_ticket_messages(parent_message_id)
WHERE parent_message_id IS NOT NULL;

CREATE INDEX development_ticket_messages_ticket_created_idx
ON public.development_ticket_messages(ticket_id, created_at);

CREATE INDEX development_ticket_messages_open_questions_idx
ON public.development_ticket_messages(ticket_id, created_at)
WHERE message_type = 'question';

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

  IF private.is_code_admin(actor_id) THEN
    IF NEW.parent_message_id IS NOT NULL THEN
      RAISE EXCEPTION 'Admins devem registrar uma nova pergunta.';
    END IF;
    NEW.message_type := 'question';
  ELSIF ticket_reporter_id = actor_id THEN
    IF NEW.parent_message_id IS NULL THEN
      RAISE EXCEPTION 'A resposta deve estar vinculada a uma pergunta pendente.';
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
  ELSE
    RAISE EXCEPTION 'Somente o Admin do Code e o solicitante podem conversar neste ticket.';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.validate_development_ticket_message() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.validate_development_ticket_message() TO service_role;

CREATE TRIGGER development_ticket_message_validate
BEFORE INSERT ON public.development_ticket_messages
FOR EACH ROW EXECUTE FUNCTION private.validate_development_ticket_message();