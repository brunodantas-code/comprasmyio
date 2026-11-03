CREATE OR REPLACE FUNCTION public.mytosis_node_can_converse(_node_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 WITH RECURSIVE ancestors AS (
 SELECT id,parent_id FROM public.mytosis_nodes WHERE id=_node_id
 UNION SELECT n.id,n.parent_id FROM public.mytosis_nodes n JOIN ancestors a ON a.parent_id=n.id
 ), flow AS (
 SELECT n.id,n.responsible_id,n.created_by FROM public.mytosis_nodes n JOIN ancestors a ON n.id=a.id WHERE a.parent_id IS NULL
 UNION SELECT n.id,n.responsible_id,n.created_by FROM public.mytosis_nodes n JOIN flow f ON n.parent_id=f.id
 )
 SELECT _user_id=auth.uid() AND public.mytosis_role(_user_id) IS NOT NULL AND EXISTS(SELECT 1 FROM public.mytosis_nodes WHERE id=_node_id) AND (
 public.mytosis_can_edit(_user_id) OR EXISTS(SELECT 1 FROM flow WHERE _user_id IN(responsible_id,created_by))
 OR EXISTS(SELECT 1 FROM public.mytosis_tasks t JOIN flow f ON t.node_id=f.id WHERE _user_id IN(t.responsible_id,t.created_by) OR _user_id=ANY(t.involved_ids)))
$$;
REVOKE ALL ON FUNCTION public.mytosis_node_can_converse(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.mytosis_node_can_converse(uuid,uuid) TO authenticated;
CREATE TABLE public.mytosis_node_messages (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),node_id uuid NOT NULL REFERENCES public.mytosis_nodes(id) ON DELETE CASCADE,
 author_id uuid NOT NULL DEFAULT auth.uid(),text text NOT NULL CHECK(length(trim(text)) BETWEEN 1 AND 4000),
 kind text NOT NULL CHECK(kind IN('question','answer')),reply_to_id uuid REFERENCES public.mytosis_node_messages(id),
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT,INSERT,UPDATE ON public.mytosis_node_messages TO authenticated;
GRANT ALL ON public.mytosis_node_messages TO service_role;
ALTER TABLE public.mytosis_node_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Mytosis node messages read" ON public.mytosis_node_messages FOR SELECT TO authenticated USING(public.mytosis_role(auth.uid()) IS NOT NULL);
CREATE POLICY "Mytosis node messages create" ON public.mytosis_node_messages FOR INSERT TO authenticated WITH CHECK(author_id=auth.uid() AND public.mytosis_node_can_converse(node_id,auth.uid()));
CREATE POLICY "Mytosis node messages edit author" ON public.mytosis_node_messages FOR UPDATE TO authenticated USING(author_id=auth.uid() AND public.mytosis_node_can_converse(node_id,auth.uid())) WITH CHECK(author_id=auth.uid() AND public.mytosis_node_can_converse(node_id,auth.uid()));
CREATE INDEX mytosis_node_messages_node_idx ON public.mytosis_node_messages(node_id,created_at);
CREATE UNIQUE INDEX mytosis_node_messages_one_answer ON public.mytosis_node_messages(reply_to_id) WHERE kind='answer';
CREATE TABLE public.mytosis_node_logs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),node_id uuid NOT NULL REFERENCES public.mytosis_nodes(id) ON DELETE CASCADE,
 actor_id uuid,text text NOT NULL,created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.mytosis_node_logs TO authenticated;
GRANT ALL ON public.mytosis_node_logs TO service_role;
ALTER TABLE public.mytosis_node_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Mytosis node logs read" ON public.mytosis_node_logs FOR SELECT TO authenticated USING(public.mytosis_role(auth.uid()) IS NOT NULL);
CREATE INDEX mytosis_node_logs_node_idx ON public.mytosis_node_logs(node_id,created_at);
CREATE OR REPLACE FUNCTION public.guard_mytosis_node_message() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF TG_OP='INSERT' THEN NEW.author_id:=auth.uid();NEW.created_at:=now();
 ELSE
 IF NEW.id IS DISTINCT FROM OLD.id OR NEW.node_id IS DISTINCT FROM OLD.node_id OR NEW.author_id IS DISTINCT FROM OLD.author_id OR NEW.kind IS DISTINCT FROM OLD.kind OR NEW.reply_to_id IS DISTINCT FROM OLD.reply_to_id OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN RAISE EXCEPTION 'Somente o texto da mensagem pode ser alterado.'; END IF;
 END IF;
 IF NEW.kind='answer' THEN
 IF NOT EXISTS(SELECT 1 FROM public.mytosis_node_messages q WHERE q.id=NEW.reply_to_id AND q.node_id=NEW.node_id AND q.kind='question' AND q.author_id<>NEW.author_id) THEN RAISE EXCEPTION 'Selecione uma pergunta de outro participante deste OKR.'; END IF;
 ELSIF NEW.reply_to_id IS NOT NULL THEN RAISE EXCEPTION 'Uma pergunta não pode estar vinculada a outra mensagem.'; END IF;
 NEW.updated_at:=now();RETURN NEW;
END $$;
CREATE TRIGGER guard_mytosis_node_message BEFORE INSERT OR UPDATE ON public.mytosis_node_messages FOR EACH ROW EXECUTE FUNCTION public.guard_mytosis_node_message();
CREATE OR REPLACE FUNCTION public.audit_mytosis_node() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE event_text text; before_data jsonb; after_data jsonb;
BEGIN
 IF TG_TABLE_NAME='mytosis_node_messages' THEN
 IF TG_OP='INSERT' THEN event_text:=CASE WHEN NEW.kind='question' THEN 'Pergunta' ELSE 'Resposta' END||': '||NEW.text;
 ELSE IF NEW.text IS NOT DISTINCT FROM OLD.text THEN RETURN NEW; END IF; event_text:=CASE WHEN NEW.kind='question' THEN 'Pergunta editada' ELSE 'Resposta editada' END||E'\nAntes: '||OLD.text||E'\nDepois: '||NEW.text; END IF;
 INSERT INTO public.mytosis_node_logs(node_id,actor_id,text) VALUES(NEW.node_id,auth.uid(),event_text);
 ELSE
 IF NEW.is_process THEN RETURN NEW; END IF;
 IF TG_OP='INSERT' THEN event_text:='OKR aberto: '||NEW.title;
 ELSE
 before_data:=jsonb_build_object('titulo',OLD.title,'descricao',OLD.description,'responsavel',OLD.responsible_id,'prazo',OLD.due_date,'conclusao',OLD.progress,'peso',OLD.weight);
 after_data:=jsonb_build_object('titulo',NEW.title,'descricao',NEW.description,'responsavel',NEW.responsible_id,'prazo',NEW.due_date,'conclusao',NEW.progress,'peso',NEW.weight);
 IF before_data=after_data THEN RETURN NEW; END IF;
 event_text:='Observação: dados do OKR alterados'||E'\nAntes: '||before_data::text||E'\nDepois: '||after_data::text;
 IF NEW.progress IS DISTINCT FROM OLD.progress THEN event_text:='Conclusão: '||OLD.progress||'% → '||NEW.progress||'%'||E'\n'||event_text; END IF;
 END IF;
 INSERT INTO public.mytosis_node_logs(node_id,actor_id,text) VALUES(NEW.id,auth.uid(),event_text);
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER audit_mytosis_node AFTER INSERT OR UPDATE ON public.mytosis_nodes FOR EACH ROW EXECUTE FUNCTION public.audit_mytosis_node();
CREATE TRIGGER audit_mytosis_node_message AFTER INSERT OR UPDATE ON public.mytosis_node_messages FOR EACH ROW EXECUTE FUNCTION public.audit_mytosis_node();
REVOKE ALL ON FUNCTION public.audit_mytosis_node() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.guard_mytosis_node_message() FROM PUBLIC,anon,authenticated;