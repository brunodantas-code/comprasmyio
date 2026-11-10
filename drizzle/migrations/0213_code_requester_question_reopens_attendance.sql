CREATE OR REPLACE FUNCTION private.sync_development_ticket_reply_status()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'private'
AS $function$
DECLARE t record;
BEGIN
  SELECT id, reporter_id, status INTO t FROM public.development_tickets WHERE id = NEW.ticket_id;
  IF t.status IN ('concluido','excluido') THEN RETURN NEW; END IF;
  PERFORM set_config('app.code_auto_status','on',true);
  IF NEW.message_type = 'question' AND NEW.author_id <> t.reporter_id THEN
    UPDATE public.development_tickets SET status='aguardando_resposta' WHERE id=t.id AND status <> 'aguardando_resposta';
  ELSIF NEW.message_type = 'question' AND NEW.author_id = t.reporter_id AND t.status = 'atendido' THEN
    UPDATE public.development_tickets SET status='em_atendimento' WHERE id=t.id;
  ELSIF NEW.message_type = 'answer' AND NEW.author_id = t.reporter_id AND t.status='aguardando_resposta'
    AND NOT EXISTS (SELECT 1 FROM public.development_ticket_messages q WHERE q.ticket_id=t.id AND q.message_type='question' AND q.author_id<>t.reporter_id
      AND NOT EXISTS (SELECT 1 FROM public.development_ticket_messages a WHERE a.parent_message_id=q.id)) THEN
    UPDATE public.development_tickets SET status='em_atendimento' WHERE id=t.id;
  END IF;
  PERFORM set_config('app.code_auto_status','off',true);
  RETURN NEW;
END $function$;

CREATE OR REPLACE FUNCTION private.hold_code_ticket_with_open_requester_questions()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'private'
AS $function$
BEGIN
  IF NEW.status = 'atendido' AND OLD.status IS DISTINCT FROM 'atendido' AND EXISTS (
    SELECT 1 FROM public.development_ticket_messages q
    WHERE q.ticket_id = NEW.id AND q.message_type = 'question' AND q.author_id = NEW.reporter_id
      AND NOT EXISTS (SELECT 1 FROM public.development_ticket_messages a WHERE a.parent_message_id = q.id)) THEN
    NEW.status := 'em_atendimento';
  END IF;
  RETURN NEW;
END $function$;
REVOKE ALL ON FUNCTION private.hold_code_ticket_with_open_requester_questions() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS development_ticket_hold_open_questions ON public.development_tickets;
CREATE TRIGGER development_ticket_hold_open_questions BEFORE UPDATE OF status ON public.development_tickets
FOR EACH ROW EXECUTE FUNCTION private.hold_code_ticket_with_open_requester_questions();