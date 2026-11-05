CREATE OR REPLACE FUNCTION public.validate_code_directed_message()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE actor uuid:=auth.uid(); ticket public.development_tickets%ROWTYPE; parent public.development_ticket_messages%ROWTYPE; admin boolean;
BEGIN
 IF current_setting('app.code_auto_close_answer', true) = 'on' AND NEW.message_type = 'answer' AND NEW.parent_message_id IS NOT NULL THEN
  NEW.recipient_id:=NULL; NEW.requester_seen_at:=now(); RETURN NEW;
 END IF;
 IF actor IS NULL OR NEW.author_id IS DISTINCT FROM actor THEN RAISE EXCEPTION 'Autor inválido.' USING ERRCODE='42501'; END IF;
 SELECT * INTO ticket FROM public.development_tickets WHERE id=NEW.ticket_id FOR UPDATE;
 IF NOT FOUND OR ticket.status IN ('concluido','excluido') THEN RAISE EXCEPTION 'Chamado indisponível para mensagens.'; END IF;
 admin:=private.is_code_admin(actor);
 IF NEW.parent_message_id IS NOT NULL THEN
  SELECT * INTO parent FROM public.development_ticket_messages WHERE id=NEW.parent_message_id;
  IF parent.ticket_id IS DISTINCT FROM NEW.ticket_id OR parent.message_type IS DISTINCT FROM 'question' OR parent.author_id=actor THEN RAISE EXCEPTION 'Pergunta inválida.'; END IF;
  IF parent.recipient_id IS NOT NULL THEN
   IF parent.recipient_id<>actor THEN RAISE EXCEPTION 'Somente o destinatário pode responder.' USING ERRCODE='42501'; END IF;
  ELSIF NOT ((parent.author_id=ticket.reporter_id AND admin) OR (parent.author_id<>ticket.reporter_id AND actor=ticket.reporter_id)) THEN RAISE EXCEPTION 'Sem permissão para responder.' USING ERRCODE='42501'; END IF;
  IF EXISTS(SELECT 1 FROM public.development_ticket_messages WHERE parent_message_id=parent.id) THEN RAISE EXCEPTION 'Pergunta já respondida.'; END IF;
  NEW.message_type:='answer'; NEW.recipient_id:=NULL;
 ELSE
  IF NOT admin AND actor<>ticket.reporter_id THEN RAISE EXCEPTION 'Sem permissão para iniciar perguntas.' USING ERRCODE='42501'; END IF;
  NEW.message_type:='question';
  IF NEW.recipient_id IS NULL AND actor<>ticket.reporter_id THEN NEW.recipient_id:=ticket.reporter_id; END IF;
  IF NEW.recipient_id IS NOT NULL AND (NEW.recipient_id=actor OR NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=NEW.recipient_id AND deleted_at IS NULL)) THEN RAISE EXCEPTION 'Selecione outro usuário ativo como destinatário.'; END IF;
 END IF;
 NEW.requester_seen_at:=NULL;
 RETURN NEW;
END; $function$;

CREATE OR REPLACE FUNCTION private.code_auto_answer_on_conclusion(_ticket_id uuid)
 RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','private'
AS $function$
DECLARE t public.development_tickets%ROWTYPE; n integer;
BEGIN
 SELECT * INTO t FROM public.development_tickets WHERE id=_ticket_id;
 IF NOT FOUND OR t.status <> 'concluido' THEN RETURN 0; END IF;
 PERFORM set_config('app.code_auto_close_answer','on',true);
 INSERT INTO public.development_ticket_messages(ticket_id, author_id, message_type, parent_message_id, message)
 SELECT t.id, t.reporter_id, 'answer', q.id, 'Chamado concluído pelo Solicitante, sem mais observações.'
 FROM public.development_ticket_messages q
 WHERE q.ticket_id=t.id AND q.message_type='question' AND q.author_id<>t.reporter_id
   AND (q.recipient_id IS NULL OR q.recipient_id=t.reporter_id)
   AND NOT EXISTS (SELECT 1 FROM public.development_ticket_messages a WHERE a.parent_message_id=q.id);
 GET DIAGNOSTICS n = ROW_COUNT;
 PERFORM set_config('app.code_auto_close_answer','off',true);
 RETURN n;
END $function$;
REVOKE ALL ON FUNCTION private.code_auto_answer_on_conclusion(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION private.trg_code_auto_answer_on_conclusion()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','private'
AS $function$
BEGIN
 PERFORM private.code_auto_answer_on_conclusion(NEW.id);
 RETURN NULL;
END $function$;

DROP TRIGGER IF EXISTS development_ticket_auto_answer_on_conclusion ON public.development_tickets;
CREATE TRIGGER development_ticket_auto_answer_on_conclusion
AFTER UPDATE OF status ON public.development_tickets
FOR EACH ROW WHEN (NEW.status = 'concluido' AND OLD.status IS DISTINCT FROM 'concluido')
EXECUTE FUNCTION private.trg_code_auto_answer_on_conclusion();