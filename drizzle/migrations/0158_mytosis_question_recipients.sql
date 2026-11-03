ALTER TABLE public.mytosis_node_messages ADD COLUMN recipient_id uuid REFERENCES public.profiles(id);
ALTER TABLE public.mytosis_task_messages ADD COLUMN recipient_id uuid REFERENCES public.profiles(id);
CREATE INDEX mytosis_node_messages_recipient_idx ON public.mytosis_node_messages(recipient_id) WHERE kind='question';
CREATE INDEX mytosis_task_messages_recipient_idx ON public.mytosis_task_messages(recipient_id) WHERE kind='question';

CREATE OR REPLACE FUNCTION public.mytosis_node_question_participant(_node_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 WITH RECURSIVE ancestors AS (
 SELECT id,parent_id FROM public.mytosis_nodes WHERE id=_node_id
 UNION SELECT n.id,n.parent_id FROM public.mytosis_nodes n JOIN ancestors a ON a.parent_id=n.id
 ), flow AS (
 SELECT n.id,n.responsible_id,n.created_by FROM public.mytosis_nodes n JOIN ancestors a ON n.id=a.id WHERE a.parent_id IS NULL
 UNION SELECT n.id,n.responsible_id,n.created_by FROM public.mytosis_nodes n JOIN flow f ON n.parent_id=f.id
 )
 SELECT auth.uid() IS NOT NULL AND public.mytosis_role(auth.uid()) IS NOT NULL AND public.mytosis_role(_user_id) IS NOT NULL AND EXISTS(SELECT 1 FROM public.mytosis_nodes WHERE id=_node_id) AND (
 public.mytosis_can_edit(_user_id) OR EXISTS(SELECT 1 FROM flow WHERE _user_id IN(responsible_id,created_by))
 OR EXISTS(SELECT 1 FROM public.mytosis_tasks t JOIN flow f ON t.node_id=f.id WHERE _user_id IN(t.responsible_id,t.created_by) OR _user_id=ANY(t.involved_ids)))
$$;
REVOKE ALL ON FUNCTION public.mytosis_node_question_participant(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.mytosis_node_question_participant(uuid,uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.mytosis_question_recipients(_node_id uuid, _task_id uuid DEFAULT NULL)
RETURNS TABLE(id uuid,full_name text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT p.id,p.full_name FROM public.profiles p
 WHERE p.id<>auth.uid() AND auth.uid() IS NOT NULL AND (
 (_task_id IS NULL AND public.mytosis_node_can_converse(_node_id,auth.uid()) AND public.mytosis_node_question_participant(_node_id,p.id))
 OR (_task_id IS NOT NULL AND EXISTS(SELECT 1 FROM public.mytosis_tasks t WHERE t.id=_task_id AND t.node_id=_node_id)
 AND public.mytosis_task_can_converse(_task_id,auth.uid()) AND public.mytosis_task_can_converse(_task_id,p.id)))
 ORDER BY p.full_name
$$;
REVOKE ALL ON FUNCTION public.mytosis_question_recipients(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.mytosis_question_recipients(uuid,uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.guard_mytosis_question_recipient()
RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE question_recipient uuid; question_author uuid;
BEGIN
 IF TG_OP='UPDATE' THEN
  IF NEW.recipient_id IS DISTINCT FROM OLD.recipient_id THEN RAISE EXCEPTION 'O destinatário original da pergunta não pode ser alterado.'; END IF;
  RETURN NEW;
 END IF;
 IF NEW.kind='question' THEN
  IF NEW.recipient_id IS NULL OR NEW.recipient_id=auth.uid() THEN RAISE EXCEPTION 'Escolha outro usuário como destinatário da pergunta.'; END IF;
  IF TG_TABLE_NAME='mytosis_node_messages' THEN
   IF NOT public.mytosis_node_question_participant(NEW.node_id,NEW.recipient_id) THEN RAISE EXCEPTION 'O destinatário não participa desta conversa.'; END IF;
  ELSE
   IF NOT public.mytosis_task_can_converse(NEW.task_id,NEW.recipient_id) THEN RAISE EXCEPTION 'O destinatário não participa desta conversa.'; END IF;
  END IF;
 ELSE
  IF NEW.recipient_id IS NOT NULL THEN RAISE EXCEPTION 'O destinatário é definido na pergunta, não na resposta.'; END IF;
  IF TG_TABLE_NAME='mytosis_node_messages' THEN
   SELECT recipient_id,author_id INTO question_recipient,question_author FROM public.mytosis_node_messages WHERE id=NEW.reply_to_id AND node_id=NEW.node_id AND kind='question' FOR UPDATE;
   IF EXISTS(SELECT 1 FROM public.mytosis_node_messages WHERE reply_to_id=NEW.reply_to_id AND kind='answer') THEN RAISE EXCEPTION 'Esta pergunta já foi respondida.'; END IF;
  ELSE
   SELECT recipient_id,author_id INTO question_recipient,question_author FROM public.mytosis_task_messages WHERE id=NEW.reply_to_id AND task_id=NEW.task_id AND kind='question' FOR UPDATE;
   IF EXISTS(SELECT 1 FROM public.mytosis_task_messages WHERE reply_to_id=NEW.reply_to_id AND kind='answer') THEN RAISE EXCEPTION 'Esta pergunta já foi respondida.'; END IF;
  END IF;
  IF question_author IS NULL OR question_author=auth.uid() OR (question_recipient IS NOT NULL AND question_recipient<>auth.uid()) THEN RAISE EXCEPTION 'Somente o destinatário pode responder esta pergunta.'; END IF;
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.guard_mytosis_question_recipient() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER guard_mytosis_node_recipient BEFORE INSERT OR UPDATE ON public.mytosis_node_messages FOR EACH ROW EXECUTE FUNCTION public.guard_mytosis_question_recipient();
CREATE TRIGGER guard_mytosis_task_recipient BEFORE INSERT OR UPDATE ON public.mytosis_task_messages FOR EACH ROW EXECUTE FUNCTION public.guard_mytosis_question_recipient();

CREATE OR REPLACE FUNCTION public.mytosis_pending_questions()
RETURNS TABLE(message_id uuid,node_id uuid,task_id uuid,node_title text,task_title text,question_text text,author_name text,created_at timestamptz)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path=public AS $$
 SELECT q.id,q.node_id,NULL::uuid,n.title,NULL::text,q.text,p.full_name,q.created_at
 FROM public.mytosis_node_messages q JOIN public.mytosis_nodes n ON n.id=q.node_id LEFT JOIN public.profiles p ON p.id=q.author_id
 WHERE q.kind='question' AND q.recipient_id=auth.uid() AND NOT EXISTS(SELECT 1 FROM public.mytosis_node_messages a WHERE a.reply_to_id=q.id AND a.kind='answer')
 UNION ALL
 SELECT q.id,t.node_id,q.task_id,n.title,t.title,q.text,p.full_name,q.created_at
 FROM public.mytosis_task_messages q JOIN public.mytosis_tasks t ON t.id=q.task_id JOIN public.mytosis_nodes n ON n.id=t.node_id LEFT JOIN public.profiles p ON p.id=q.author_id
 WHERE q.kind='question' AND q.recipient_id=auth.uid() AND NOT EXISTS(SELECT 1 FROM public.mytosis_task_messages a WHERE a.reply_to_id=q.id AND a.kind='answer')
 ORDER BY created_at
$$;
REVOKE ALL ON FUNCTION public.mytosis_pending_questions() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.mytosis_pending_questions() TO authenticated;