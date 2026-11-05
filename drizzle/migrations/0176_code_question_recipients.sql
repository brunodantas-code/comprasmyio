ALTER TABLE public.development_ticket_messages ADD COLUMN recipient_id uuid REFERENCES public.profiles(id), ADD COLUMN requester_seen_at timestamptz;
CREATE INDEX code_messages_recipient_idx ON public.development_ticket_messages(recipient_id,ticket_id) WHERE recipient_id IS NOT NULL;
CREATE OR REPLACE FUNCTION public.code_question_participant(_ticket_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT auth.uid() IS NOT NULL AND EXISTS(SELECT 1 FROM public.development_ticket_messages WHERE ticket_id=_ticket_id AND recipient_id=auth.uid() AND message_type='question'); $$;
REVOKE ALL ON FUNCTION public.code_question_participant(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.code_question_participant(uuid) TO authenticated;
CREATE POLICY "Question recipients read related tickets" ON public.development_tickets FOR SELECT TO authenticated USING(public.code_question_participant(id));
CREATE POLICY "Question recipients read conversation" ON public.development_ticket_messages FOR SELECT TO authenticated USING(public.code_question_participant(ticket_id));
CREATE POLICY "Question recipients send answers" ON public.development_ticket_messages FOR INSERT TO authenticated WITH CHECK(author_id=auth.uid() AND message_type='answer' AND public.code_question_participant(ticket_id));
CREATE POLICY "Question recipients read logs" ON public.development_ticket_logs FOR SELECT TO authenticated USING(public.code_question_participant(ticket_id));
CREATE POLICY "Question recipients read attachments" ON public.development_ticket_attachments FOR SELECT TO authenticated USING(public.code_question_participant(ticket_id));
CREATE OR REPLACE FUNCTION public.validate_code_directed_message() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE actor uuid:=auth.uid(); ticket public.development_tickets%ROWTYPE; parent public.development_ticket_messages%ROWTYPE; admin boolean;
BEGIN
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
END; $$;
REVOKE ALL ON FUNCTION public.validate_code_directed_message() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS development_ticket_message_validate ON public.development_ticket_messages;
CREATE TRIGGER development_ticket_message_validate BEFORE INSERT ON public.development_ticket_messages FOR EACH ROW EXECUTE FUNCTION public.validate_code_directed_message();
CREATE OR REPLACE FUNCTION public.mark_code_question_alerts_read(_ticket_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 IF auth.uid() IS NULL OR NOT EXISTS(SELECT 1 FROM public.development_tickets WHERE id=_ticket_id AND reporter_id=auth.uid()) THEN RAISE EXCEPTION 'Sem permissão.' USING ERRCODE='42501'; END IF;
 UPDATE public.development_ticket_messages SET requester_seen_at=now() WHERE ticket_id=_ticket_id AND message_type='question' AND recipient_id IS NOT NULL AND recipient_id<>auth.uid() AND author_id<>auth.uid() AND requester_seen_at IS NULL;
END; $$;
REVOKE ALL ON FUNCTION public.mark_code_question_alerts_read(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.mark_code_question_alerts_read(uuid) TO authenticated;
CREATE OR REPLACE FUNCTION public.code_can_open() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT auth.uid() IS NOT NULL AND (private.has_app_access(auth.uid(),'development') OR EXISTS(SELECT 1 FROM public.development_ticket_messages WHERE recipient_id=auth.uid())); $$;
REVOKE ALL ON FUNCTION public.code_can_open() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.code_can_open() TO authenticated;
CREATE OR REPLACE FUNCTION public.code_conversation_users() RETURNS TABLE(id uuid,full_name text,email text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT p.id,p.full_name,p.email FROM public.profiles p WHERE p.deleted_at IS NULL AND public.code_can_open() ORDER BY p.full_name; $$;
REVOKE ALL ON FUNCTION public.code_conversation_users() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.code_conversation_users() TO authenticated;
COMMENT ON COLUMN public.development_ticket_messages.recipient_id IS 'Explicit question recipient; null on legacy questions preserves reporter/admin routing.';
COMMENT ON COLUMN public.development_ticket_messages.requester_seen_at IS 'Requester acknowledgment of notification for a question directed to another user.';