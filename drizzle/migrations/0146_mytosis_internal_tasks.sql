CREATE TABLE public.mytosis_tasks (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 node_id uuid NOT NULL REFERENCES public.mytosis_nodes(id) ON DELETE CASCADE,
 title text NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 200),
 description text NOT NULL DEFAULT '',
 responsible_id uuid NOT NULL,
 created_by uuid NOT NULL DEFAULT auth.uid(),
 involved_ids uuid[] NOT NULL DEFAULT '{}',
 due_date date,
 completed boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.mytosis_tasks TO authenticated;
GRANT ALL ON public.mytosis_tasks TO service_role;
ALTER TABLE public.mytosis_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Mytosis tasks read" ON public.mytosis_tasks FOR SELECT TO authenticated USING (public.mytosis_role(auth.uid()) IS NOT NULL);
CREATE POLICY "Mytosis tasks create" ON public.mytosis_tasks FOR INSERT TO authenticated WITH CHECK (public.mytosis_can_edit(auth.uid()) AND created_by = auth.uid() AND NOT completed);
CREATE POLICY "Mytosis tasks edit owners" ON public.mytosis_tasks FOR UPDATE TO authenticated USING (public.mytosis_role(auth.uid()) IS NOT NULL AND auth.uid() IN (created_by, responsible_id)) WITH CHECK (public.mytosis_role(auth.uid()) IS NOT NULL AND auth.uid() IN (created_by, responsible_id));
CREATE INDEX mytosis_tasks_node_idx ON public.mytosis_tasks(node_id);

CREATE OR REPLACE FUNCTION public.mytosis_task_can_converse(_task_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 WITH RECURSIVE ancestors AS (
 SELECT n.id, n.parent_id FROM public.mytosis_nodes n JOIN public.mytosis_tasks t ON t.node_id=n.id WHERE t.id=_task_id
 UNION ALL SELECT n.id,n.parent_id FROM public.mytosis_nodes n JOIN ancestors a ON a.parent_id=n.id
 ), flow AS (
 SELECT n.id,n.responsible_id FROM public.mytosis_nodes n JOIN ancestors a ON a.id=n.id WHERE a.parent_id IS NULL
 UNION ALL SELECT n.id,n.responsible_id FROM public.mytosis_nodes n JOIN flow f ON n.parent_id=f.id
 )
 SELECT public.mytosis_role(_user_id) IS NOT NULL AND (
 EXISTS(SELECT 1 FROM public.mytosis_tasks t WHERE t.id=_task_id AND (_user_id IN (t.created_by,t.responsible_id) OR _user_id=ANY(t.involved_ids)))
 OR EXISTS(SELECT 1 FROM flow WHERE responsible_id=_user_id)
 OR EXISTS(SELECT 1 FROM public.mytosis_tasks t JOIN flow f ON f.id=t.node_id WHERE _user_id IN (t.created_by,t.responsible_id) OR _user_id=ANY(t.involved_ids))
 )
$$;
REVOKE ALL ON FUNCTION public.mytosis_task_can_converse(uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mytosis_task_can_converse(uuid,uuid) TO authenticated;

CREATE TABLE public.mytosis_task_messages (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 task_id uuid NOT NULL REFERENCES public.mytosis_tasks(id) ON DELETE CASCADE,
 author_id uuid NOT NULL DEFAULT auth.uid(),
 text text NOT NULL CHECK(length(trim(text)) BETWEEN 1 AND 4000),
 kind text NOT NULL DEFAULT 'question' CHECK(kind IN ('question','answer')),
 reply_to_id uuid REFERENCES public.mytosis_task_messages(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.mytosis_task_messages TO authenticated;
GRANT ALL ON public.mytosis_task_messages TO service_role;
ALTER TABLE public.mytosis_task_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Mytosis task messages read" ON public.mytosis_task_messages FOR SELECT TO authenticated USING (public.mytosis_role(auth.uid()) IS NOT NULL);
CREATE POLICY "Mytosis task messages create" ON public.mytosis_task_messages FOR INSERT TO authenticated WITH CHECK(author_id=auth.uid() AND public.mytosis_task_can_converse(task_id,auth.uid()));
CREATE POLICY "Mytosis task messages edit author" ON public.mytosis_task_messages FOR UPDATE TO authenticated USING(author_id=auth.uid() AND public.mytosis_task_can_converse(task_id,auth.uid())) WITH CHECK(author_id=auth.uid() AND public.mytosis_task_can_converse(task_id,auth.uid()));
CREATE INDEX mytosis_task_messages_task_idx ON public.mytosis_task_messages(task_id,created_at);

CREATE TABLE public.mytosis_task_logs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 task_id uuid NOT NULL REFERENCES public.mytosis_tasks(id) ON DELETE CASCADE,
 actor_id uuid,
 text text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.mytosis_task_logs TO authenticated;
GRANT ALL ON public.mytosis_task_logs TO service_role;
ALTER TABLE public.mytosis_task_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Mytosis task logs read" ON public.mytosis_task_logs FOR SELECT TO authenticated USING(public.mytosis_role(auth.uid()) IS NOT NULL);
CREATE INDEX mytosis_task_logs_task_idx ON public.mytosis_task_logs(task_id,created_at);

CREATE OR REPLACE FUNCTION public.guard_mytosis_task()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
 IF TG_OP='INSERT' THEN
  NEW.created_by:=auth.uid(); NEW.completed:=false; NEW.created_at:=now();
 ELSE
  IF NEW.id IS DISTINCT FROM OLD.id OR NEW.node_id IS DISTINCT FROM OLD.node_id OR NEW.created_by IS DISTINCT FROM OLD.created_by OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN RAISE EXCEPTION 'A origem da tarefa não pode ser alterada.'; END IF;
  IF NEW.completed IS DISTINCT FROM OLD.completed AND (auth.uid() IS NULL OR auth.uid() NOT IN (OLD.created_by,OLD.responsible_id)) THEN RAISE EXCEPTION 'Somente o Responsável ou criador pode concluir ou reabrir a tarefa.'; END IF;
 END IF;
 NEW.updated_at:=now(); RETURN NEW;
END $$;
CREATE TRIGGER guard_mytosis_task BEFORE INSERT OR UPDATE ON public.mytosis_tasks FOR EACH ROW EXECUTE FUNCTION public.guard_mytosis_task();

CREATE OR REPLACE FUNCTION public.guard_mytosis_task_message()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
 IF TG_OP='INSERT' THEN
  NEW.author_id:=auth.uid(); NEW.created_at:=now();
 ELSE
  IF NEW.id IS DISTINCT FROM OLD.id OR NEW.task_id IS DISTINCT FROM OLD.task_id OR NEW.author_id IS DISTINCT FROM OLD.author_id OR NEW.kind IS DISTINCT FROM OLD.kind OR NEW.reply_to_id IS DISTINCT FROM OLD.reply_to_id OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN RAISE EXCEPTION 'Somente o texto da mensagem pode ser alterado.'; END IF;
 END IF;
 IF NEW.kind='answer' THEN
  IF NOT EXISTS(SELECT 1 FROM public.mytosis_task_messages q WHERE q.id=NEW.reply_to_id AND q.task_id=NEW.task_id AND q.kind='question' AND q.author_id<>NEW.author_id) THEN RAISE EXCEPTION 'Selecione uma pergunta de outro participante desta tarefa.'; END IF;
 ELSIF NEW.reply_to_id IS NOT NULL THEN RAISE EXCEPTION 'Uma pergunta não pode estar vinculada a outra mensagem.';
 END IF;
 NEW.updated_at:=now(); RETURN NEW;
END $$;
CREATE TRIGGER guard_mytosis_task_message BEFORE INSERT OR UPDATE ON public.mytosis_task_messages FOR EACH ROW EXECUTE FUNCTION public.guard_mytosis_task_message();

CREATE OR REPLACE FUNCTION public.audit_mytosis_task()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE event_text text;
BEGIN
 IF TG_TABLE_NAME='mytosis_tasks' THEN
  IF TG_OP='INSERT' THEN event_text:='Tarefa criada: '||NEW.title;
  ELSE
   IF NEW.title IS DISTINCT FROM OLD.title THEN INSERT INTO public.mytosis_task_logs(task_id,actor_id,text) VALUES(NEW.id,auth.uid(),'Título alterado' || E'\nAntes: '||OLD.title||E'\nDepois: '||NEW.title); END IF;
   IF NEW.completed IS DISTINCT FROM OLD.completed THEN INSERT INTO public.mytosis_task_logs(task_id,actor_id,text) VALUES(NEW.id,auth.uid(),CASE WHEN NEW.completed THEN 'Pendente → Concluída' ELSE 'Concluída → Pendente' END); END IF;
   IF NEW.description IS DISTINCT FROM OLD.description OR NEW.responsible_id IS DISTINCT FROM OLD.responsible_id OR NEW.due_date IS DISTINCT FROM OLD.due_date OR NEW.involved_ids IS DISTINCT FROM OLD.involved_ids THEN
    INSERT INTO public.mytosis_task_logs(task_id,actor_id,text) VALUES(NEW.id,auth.uid(),'Observação: dados da tarefa alterados'||E'\nAntes: '||jsonb_build_object('descricao',OLD.description,'responsavel',OLD.responsible_id,'prazo',OLD.due_date,'envolvidos',OLD.involved_ids)::text||E'\nDepois: '||jsonb_build_object('descricao',NEW.description,'responsavel',NEW.responsible_id,'prazo',NEW.due_date,'envolvidos',NEW.involved_ids)::text);
   END IF;
   RETURN NEW;
  END IF;
  INSERT INTO public.mytosis_task_logs(task_id,actor_id,text) VALUES(NEW.id,auth.uid(),event_text);
 ELSE
  event_text:=CASE WHEN NEW.kind='question' THEN 'Pergunta' ELSE 'Resposta' END||CASE WHEN TG_OP='INSERT' THEN ' enviada' ELSE ' alterada' END;
  IF TG_OP='UPDATE' THEN event_text:=event_text||E'\nAntes: '||OLD.text||E'\nDepois: '||NEW.text; ELSE event_text:=event_text||E'\n'||NEW.text; END IF;
  INSERT INTO public.mytosis_task_logs(task_id,actor_id,text) VALUES(NEW.task_id,auth.uid(),event_text);
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER audit_mytosis_task AFTER INSERT OR UPDATE ON public.mytosis_tasks FOR EACH ROW EXECUTE FUNCTION public.audit_mytosis_task();
CREATE TRIGGER audit_mytosis_task_message AFTER INSERT OR UPDATE ON public.mytosis_task_messages FOR EACH ROW EXECUTE FUNCTION public.audit_mytosis_task();