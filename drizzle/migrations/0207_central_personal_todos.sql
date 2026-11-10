CREATE TABLE public.personal_todos (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), todo_number bigint GENERATED ALWAYS AS IDENTITY UNIQUE,
 owner_id uuid NOT NULL DEFAULT auth.uid(), title text NOT NULL, description text NOT NULL,
 task_type text NOT NULL DEFAULT 'tarefa', priority text NOT NULL DEFAULT 'media', urgency text NOT NULL DEFAULT 'normal',
 expected_result text NOT NULL DEFAULT '', proposed_solution text NOT NULL DEFAULT '', due_date date,
 status text NOT NULL DEFAULT 'aberto', shared_user_ids uuid[] NOT NULL DEFAULT '{}',
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), completed_at timestamptz
);
GRANT SELECT, INSERT, UPDATE ON public.personal_todos TO authenticated;
GRANT ALL ON public.personal_todos TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.personal_todos_todo_number_seq TO authenticated, service_role;
ALTER TABLE public.personal_todos ENABLE ROW LEVEL SECURITY;
CREATE POLICY todo_read ON public.personal_todos FOR SELECT TO authenticated USING(owner_id=auth.uid() OR auth.uid()=ANY(shared_user_ids));
CREATE POLICY todo_create ON public.personal_todos FOR INSERT TO authenticated WITH CHECK(owner_id=auth.uid());
CREATE POLICY todo_edit ON public.personal_todos FOR UPDATE TO authenticated USING(owner_id=auth.uid()) WITH CHECK(owner_id=auth.uid());
CREATE TABLE public.personal_todo_messages (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), todo_id uuid NOT NULL REFERENCES public.personal_todos(id),
 author_id uuid NOT NULL DEFAULT auth.uid(), message_type text NOT NULL, message text NOT NULL,
 recipient_id uuid, parent_message_id uuid REFERENCES public.personal_todo_messages(id),
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.personal_todo_messages TO authenticated;
GRANT ALL ON public.personal_todo_messages TO service_role;
ALTER TABLE public.personal_todo_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY todo_message_read ON public.personal_todo_messages FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.personal_todos t WHERE t.id=todo_id));
CREATE POLICY todo_message_create ON public.personal_todo_messages FOR INSERT TO authenticated WITH CHECK(author_id=auth.uid() AND EXISTS(SELECT 1 FROM public.personal_todos t WHERE t.id=todo_id AND t.status NOT IN ('concluido','excluido')));
CREATE TABLE public.personal_todo_logs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), todo_id uuid NOT NULL REFERENCES public.personal_todos(id),
 actor_id uuid NOT NULL, text text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.personal_todo_logs TO authenticated;
GRANT ALL ON public.personal_todo_logs TO service_role;
ALTER TABLE public.personal_todo_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY todo_log_read ON public.personal_todo_logs FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.personal_todos t WHERE t.id=todo_id));
CREATE OR REPLACE FUNCTION public.guard_personal_todo() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF TG_OP='UPDATE' AND (NEW.id IS DISTINCT FROM OLD.id OR NEW.owner_id IS DISTINCT FROM OLD.owner_id OR NEW.todo_number IS DISTINCT FROM OLD.todo_number OR NEW.created_at IS DISTINCT FROM OLD.created_at) THEN RAISE EXCEPTION 'Identificação da tarefa não pode ser alterada'; END IF;
 IF char_length(trim(NEW.title)) NOT BETWEEN 3 AND 120 OR char_length(trim(NEW.description)) NOT BETWEEN 10 AND 4000 OR char_length(NEW.expected_result)>2000 OR char_length(NEW.proposed_solution)>4000 THEN RAISE EXCEPTION 'Verifique título, descrição e resultado esperado'; END IF;
 IF NEW.task_type NOT IN ('tarefa','melhoria','bug') OR NEW.priority NOT IN ('baixa','media','alta','critica') OR NEW.urgency NOT IN ('normal','urgente') OR NEW.status NOT IN ('aberto','em_atendimento','aguardando_resposta','atendido','concluido','excluido') THEN RAISE EXCEPTION 'Situação ou classificação inválida'; END IF;
 IF EXISTS(SELECT 1 FROM unnest(NEW.shared_user_ids) u WHERE NOT EXISTS(SELECT 1 FROM public.profiles p WHERE p.id=u AND p.deleted_at IS NULL)) THEN RAISE EXCEPTION 'Usuário compartilhado inválido'; END IF;
 NEW.updated_at:=clock_timestamp();
 IF NEW.status='concluido' THEN NEW.completed_at:=CASE WHEN TG_OP='UPDATE' THEN coalesce(OLD.completed_at,clock_timestamp()) ELSE clock_timestamp() END; ELSE NEW.completed_at:=NULL; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER guard_personal_todo BEFORE INSERT OR UPDATE ON public.personal_todos FOR EACH ROW EXECUTE FUNCTION public.guard_personal_todo();
CREATE OR REPLACE FUNCTION public.guard_personal_todo_message() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE t public.personal_todos; q public.personal_todo_messages;
BEGIN
 SELECT * INTO t FROM public.personal_todos WHERE id=NEW.todo_id FOR UPDATE;
 IF t.id IS NULL OR t.status IN ('concluido','excluido') OR NEW.author_id IS DISTINCT FROM auth.uid() OR char_length(trim(NEW.message)) NOT BETWEEN 1 AND 4000 THEN RAISE EXCEPTION 'Não é possível enviar esta mensagem'; END IF;
 IF NEW.message_type='question' THEN
  IF NEW.parent_message_id IS NOT NULL OR NEW.recipient_id IS NULL OR NEW.recipient_id=NEW.author_id OR NOT (NEW.recipient_id=t.owner_id OR NEW.recipient_id=ANY(t.shared_user_ids)) THEN RAISE EXCEPTION 'Selecione um participante da tarefa'; END IF;
 ELSIF NEW.message_type='answer' THEN
  SELECT * INTO q FROM public.personal_todo_messages WHERE id=NEW.parent_message_id AND todo_id=NEW.todo_id AND message_type='question';
  IF q.id IS NULL OR q.recipient_id IS DISTINCT FROM auth.uid() OR EXISTS(SELECT 1 FROM public.personal_todo_messages WHERE parent_message_id=q.id AND message_type='answer') THEN RAISE EXCEPTION 'Pergunta já respondida ou não dirigida a você'; END IF;
  NEW.recipient_id:=q.author_id;
 ELSIF NEW.message_type='observation' THEN
  IF NEW.parent_message_id IS NOT NULL THEN RAISE EXCEPTION 'Observação inválida'; END IF;
 ELSE RAISE EXCEPTION 'Tipo de mensagem inválido'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER guard_personal_todo_message BEFORE INSERT ON public.personal_todo_messages FOR EACH ROW EXECUTE FUNCTION public.guard_personal_todo_message();
CREATE OR REPLACE FUNCTION public.audit_personal_todo() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE event_text text;
BEGIN
 IF TG_TABLE_NAME='personal_todos' THEN
  IF TG_OP='INSERT' THEN event_text:='Tarefa criada: '||NEW.title;
  ELSE event_text:='Tarefa alterada'||E'\nAntes: '||jsonb_build_object('titulo',OLD.title,'descricao',OLD.description,'resultado',OLD.expected_result,'solucao',OLD.proposed_solution,'prazo',OLD.due_date,'situacao',OLD.status,'compartilhada',OLD.shared_user_ids)::text||E'\nDepois: '||jsonb_build_object('titulo',NEW.title,'descricao',NEW.description,'resultado',NEW.expected_result,'solucao',NEW.proposed_solution,'prazo',NEW.due_date,'situacao',NEW.status,'compartilhada',NEW.shared_user_ids)::text; END IF;
  INSERT INTO public.personal_todo_logs(todo_id,actor_id,text) VALUES(NEW.id,auth.uid(),event_text);
 ELSE
  INSERT INTO public.personal_todo_logs(todo_id,actor_id,text) VALUES(NEW.todo_id,auth.uid(),CASE NEW.message_type WHEN 'question' THEN 'Pergunta' WHEN 'answer' THEN 'Resposta' ELSE 'Observação' END||': '||NEW.message);
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER audit_personal_todo AFTER INSERT OR UPDATE ON public.personal_todos FOR EACH ROW EXECUTE FUNCTION public.audit_personal_todo();
CREATE TRIGGER audit_personal_todo_message AFTER INSERT ON public.personal_todo_messages FOR EACH ROW EXECUTE FUNCTION public.audit_personal_todo();
CREATE OR REPLACE FUNCTION public.personal_todo_users() RETURNS TABLE(id uuid,full_name text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT p.id,p.full_name FROM public.profiles p WHERE auth.uid() IS NOT NULL AND p.deleted_at IS NULL ORDER BY p.full_name $$;
REVOKE ALL ON FUNCTION public.personal_todo_users() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.personal_todo_users() TO authenticated;
CREATE INDEX personal_todo_messages_task ON public.personal_todo_messages(todo_id,created_at);
CREATE INDEX personal_todos_owner ON public.personal_todos(owner_id);
CREATE INDEX personal_todos_shared ON public.personal_todos USING gin(shared_user_ids);