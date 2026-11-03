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
  PERFORM pg_advisory_xact_lock(hashtextextended(TG_TABLE_NAME||COALESCE(NEW.reply_to_id::text,''),0));
  IF TG_TABLE_NAME='mytosis_node_messages' THEN
   SELECT recipient_id,author_id INTO question_recipient,question_author FROM public.mytosis_node_messages WHERE id=NEW.reply_to_id AND node_id=NEW.node_id AND kind='question';
   IF EXISTS(SELECT 1 FROM public.mytosis_node_messages WHERE reply_to_id=NEW.reply_to_id AND kind='answer') THEN RAISE EXCEPTION 'Esta pergunta já foi respondida.'; END IF;
  ELSE
   SELECT recipient_id,author_id INTO question_recipient,question_author FROM public.mytosis_task_messages WHERE id=NEW.reply_to_id AND task_id=NEW.task_id AND kind='question';
   IF EXISTS(SELECT 1 FROM public.mytosis_task_messages WHERE reply_to_id=NEW.reply_to_id AND kind='answer') THEN RAISE EXCEPTION 'Esta pergunta já foi respondida.'; END IF;
  END IF;
  IF question_author IS NULL OR question_author=auth.uid() OR (question_recipient IS NOT NULL AND question_recipient<>auth.uid()) THEN RAISE EXCEPTION 'Somente o destinatário pode responder esta pergunta.'; END IF;
 END IF;
 RETURN NEW;
END $$;