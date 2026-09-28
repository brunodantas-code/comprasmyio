CREATE OR REPLACE FUNCTION public.validate_code_message_attachment()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.message_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.development_ticket_messages m
    WHERE m.id = NEW.message_id AND m.ticket_id = NEW.ticket_id AND m.author_id = NEW.uploaded_by
  ) THEN
    RAISE EXCEPTION 'Anexo deve pertencer a uma mensagem do mesmo ticket e autor';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER validate_code_message_attachment_before_insert
BEFORE INSERT OR UPDATE OF message_id, ticket_id, uploaded_by ON public.development_ticket_attachments
FOR EACH ROW EXECUTE FUNCTION public.validate_code_message_attachment();