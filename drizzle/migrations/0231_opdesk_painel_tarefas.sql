CREATE OR REPLACE FUNCTION public.opdesk_has_access()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
SELECT auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id=auth.uid() AND p.is_active AND p.deleted_at IS NULL) AND (EXISTS (SELECT 1 FROM public.user_app_access a WHERE a.user_id=auth.uid() AND a.app_key='chamados') OR public.is_customer_support_analyst(auth.uid()));
$$;
REVOKE ALL ON FUNCTION public.opdesk_has_access() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.opdesk_has_access() TO authenticated,service_role;
CREATE TABLE public.opdesk_clients(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),name text NOT NULL CHECK(length(trim(name)) BETWEEN 1 AND 180),created_by uuid NOT NULL REFERENCES public.profiles(id),created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT,INSERT,UPDATE,DELETE ON public.opdesk_clients TO authenticated;
GRANT ALL ON public.opdesk_clients TO service_role;
ALTER TABLE public.opdesk_clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY opdesk_clients_read ON public.opdesk_clients FOR SELECT TO authenticated USING(public.opdesk_has_access());
CREATE POLICY opdesk_clients_insert ON public.opdesk_clients FOR INSERT TO authenticated WITH CHECK(public.opdesk_has_access() AND created_by=auth.uid());
CREATE POLICY opdesk_clients_update ON public.opdesk_clients FOR UPDATE TO authenticated USING(public.opdesk_has_access()) WITH CHECK(public.opdesk_has_access());
CREATE POLICY opdesk_clients_delete ON public.opdesk_clients FOR DELETE TO authenticated USING(public.opdesk_has_access());
CREATE UNIQUE INDEX opdesk_clients_name_unique ON public.opdesk_clients(lower(trim(name)));
CREATE TABLE public.opdesk_responsibles(user_id uuid PRIMARY KEY REFERENCES public.profiles(id),created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT,INSERT,DELETE ON public.opdesk_responsibles TO authenticated;
GRANT ALL ON public.opdesk_responsibles TO service_role;
ALTER TABLE public.opdesk_responsibles ENABLE ROW LEVEL SECURITY;
CREATE POLICY opdesk_responsibles_read ON public.opdesk_responsibles FOR SELECT TO authenticated USING(public.opdesk_has_access());
CREATE POLICY opdesk_responsibles_insert ON public.opdesk_responsibles FOR INSERT TO authenticated WITH CHECK(public.opdesk_has_access() AND EXISTS(SELECT 1 FROM public.profiles p WHERE p.id=user_id AND p.is_active AND p.deleted_at IS NULL));
CREATE POLICY opdesk_responsibles_delete ON public.opdesk_responsibles FOR DELETE TO authenticated USING(public.opdesk_has_access());
CREATE SEQUENCE public.opdesk_task_number_seq;
CREATE TABLE public.opdesk_tasks(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),task_number bigint NOT NULL DEFAULT nextval('public.opdesk_task_number_seq') UNIQUE,client_id uuid NOT NULL REFERENCES public.opdesk_clients(id) ON DELETE RESTRICT,title text NOT NULL CHECK(length(trim(title)) BETWEEN 1 AND 240),action_type text NOT NULL CHECK(action_type IN ('Manutenção','Instalação','Substituição','Revisão','Realocação','Software','Painel','App','Retirada de Sensor/SW','Análise de Ponto','Outros')),action_custom text, start_date date,end_date date,priority text NOT NULL DEFAULT 'Média' CHECK(priority IN('Baixa','Média','Alta','Urgente')),status text NOT NULL DEFAULT 'Pendente' CHECK(status IN('Aguardando','Pendente','Em Execução','Em Revisão','Concluída','Fechado')),responsible_ids uuid[] NOT NULL DEFAULT '{}',agents jsonb NOT NULL DEFAULT '[]',links text[] NOT NULL DEFAULT '{}',parent_task_id uuid REFERENCES public.opdesk_tasks(id) ON DELETE RESTRICT,subtask_number integer,flow_rule text NOT NULL DEFAULT 'Nenhuma' CHECK(flow_rule IN('Nenhuma','Opção 1','Opção 2','Opção 3','Opção 4')),next_subtask_number integer NOT NULL DEFAULT 1,created_by uuid NOT NULL REFERENCES public.profiles(id),completed_at timestamptz,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),deleted_at timestamptz, CHECK((parent_task_id IS NULL AND subtask_number IS NULL AND flow_rule='Nenhuma') OR (parent_task_id IS NOT NULL AND subtask_number>0)),UNIQUE(parent_task_id,subtask_number));
GRANT SELECT ON public.opdesk_tasks TO authenticated;
GRANT ALL ON public.opdesk_tasks TO service_role;
GRANT ALL ON SEQUENCE public.opdesk_task_number_seq TO service_role;
ALTER TABLE public.opdesk_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY opdesk_tasks_read ON public.opdesk_tasks FOR SELECT TO authenticated USING(public.opdesk_has_access() AND deleted_at IS NULL);
CREATE INDEX opdesk_tasks_client ON public.opdesk_tasks(client_id) WHERE deleted_at IS NULL;
CREATE INDEX opdesk_tasks_parent ON public.opdesk_tasks(parent_task_id) WHERE deleted_at IS NULL;
CREATE TABLE public.opdesk_task_logs(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),task_id uuid NOT NULL REFERENCES public.opdesk_tasks(id),text text NOT NULL,actor_id uuid REFERENCES public.profiles(id),actor_email text NOT NULL,created_at timestamptz NOT NULL DEFAULT clock_timestamp());
GRANT SELECT ON public.opdesk_task_logs TO authenticated;
GRANT ALL ON public.opdesk_task_logs TO service_role;
ALTER TABLE public.opdesk_task_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY opdesk_logs_read ON public.opdesk_task_logs FOR SELECT TO authenticated USING(public.opdesk_has_access());
CREATE TABLE public.opdesk_task_observations(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),task_id uuid NOT NULL REFERENCES public.opdesk_tasks(id),text text NOT NULL CHECK(length(trim(text)) BETWEEN 1 AND 6000),author_id uuid NOT NULL REFERENCES public.profiles(id),author_email text NOT NULL,created_at timestamptz NOT NULL DEFAULT clock_timestamp());
GRANT SELECT ON public.opdesk_task_observations TO authenticated;
GRANT ALL ON public.opdesk_task_observations TO service_role;
ALTER TABLE public.opdesk_task_observations ENABLE ROW LEVEL SECURITY;
CREATE POLICY opdesk_observations_read ON public.opdesk_task_observations FOR SELECT TO authenticated USING(public.opdesk_has_access());
CREATE TABLE public.opdesk_task_attachments(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),task_id uuid NOT NULL REFERENCES public.opdesk_tasks(id),uploaded_by uuid NOT NULL REFERENCES public.profiles(id),file_name text NOT NULL CHECK(length(file_name) BETWEEN 1 AND 240),storage_path text NOT NULL UNIQUE,content_type text NOT NULL,file_size bigint NOT NULL CHECK(file_size>0 AND file_size<=20971520),created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT,INSERT,DELETE ON public.opdesk_task_attachments TO authenticated;
GRANT ALL ON public.opdesk_task_attachments TO service_role;
ALTER TABLE public.opdesk_task_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY opdesk_attachments_read ON public.opdesk_task_attachments FOR SELECT TO authenticated USING(public.opdesk_has_access());
CREATE POLICY opdesk_attachments_insert ON public.opdesk_task_attachments FOR INSERT TO authenticated WITH CHECK(public.opdesk_has_access() AND uploaded_by=auth.uid() AND EXISTS(SELECT 1 FROM public.opdesk_tasks t WHERE t.id=task_id AND t.deleted_at IS NULL) AND split_part(storage_path,'/',1)=auth.uid()::text AND split_part(storage_path,'/',2)=task_id::text);
CREATE POLICY opdesk_attachments_delete ON public.opdesk_task_attachments FOR DELETE TO authenticated USING(public.opdesk_has_access());
CREATE POLICY opdesk_files_read ON storage.objects FOR SELECT TO authenticated USING(bucket_id='opdesk-task-attachments' AND public.opdesk_has_access() AND EXISTS(SELECT 1 FROM public.opdesk_task_attachments a JOIN public.opdesk_tasks t ON t.id=a.task_id WHERE a.storage_path=name AND t.deleted_at IS NULL));
CREATE POLICY opdesk_files_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK(bucket_id='opdesk-task-attachments' AND public.opdesk_has_access() AND split_part(name,'/',1)=auth.uid()::text AND EXISTS(SELECT 1 FROM public.opdesk_tasks t WHERE t.id::text=split_part(name,'/',2) AND t.deleted_at IS NULL));
CREATE POLICY opdesk_files_delete ON storage.objects FOR DELETE TO authenticated USING(bucket_id='opdesk-task-attachments' AND public.opdesk_has_access() AND (split_part(name,'/',1)=auth.uid()::text OR EXISTS(SELECT 1 FROM public.opdesk_task_attachments a WHERE a.storage_path=name)));
CREATE OR REPLACE FUNCTION public.opdesk_flow_blocks(_rule text,_sub text,_main text) RETURNS boolean LANGUAGE sql IMMUTABLE AS $$ SELECT (_rule IN('Opção 1','Opção 4') AND _sub='Aguardando' AND _main<>'Aguardando') OR (_rule='Opção 2' AND _sub='Aguardando' AND _main IN('Concluída','Fechado')) OR (_rule IN('Opção 3','Opção 4') AND _sub NOT IN('Concluída','Fechado') AND _main IN('Concluída','Fechado')); $$;
CREATE OR REPLACE FUNCTION public.opdesk_directory() RETURNS TABLE(id uuid,full_name text,email text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT p.id,p.full_name,p.email FROM public.profiles p WHERE public.opdesk_has_access() AND p.is_active AND p.deleted_at IS NULL AND (EXISTS(SELECT 1 FROM public.user_app_access a WHERE a.user_id=p.id AND a.app_key='chamados') OR public.is_customer_support_analyst(p.id)) ORDER BY p.full_name; $$;
REVOKE ALL ON FUNCTION public.opdesk_directory() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.opdesk_directory() TO authenticated;
CREATE OR REPLACE FUNCTION public.opdesk_guard_task() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE parent public.opdesk_tasks; child public.opdesk_tasks; agent jsonb; rid uuid;
BEGIN
PERFORM pg_advisory_xact_lock(hashtext('opdesk_tasks_write'));
IF TG_OP='UPDATE' AND NEW.deleted_at IS DISTINCT FROM OLD.deleted_at AND NEW.deleted_at IS NOT NULL THEN
 IF EXISTS(SELECT 1 FROM public.opdesk_tasks WHERE parent_task_id=OLD.id AND deleted_at IS NULL) THEN RAISE EXCEPTION 'Desvincule ou exclua as sub-tarefas antes de excluir a tarefa principal.'; END IF;
 NEW.updated_at:=clock_timestamp(); RETURN NEW;
END IF;
IF NEW.deleted_at IS NOT NULL THEN RETURN NEW; END IF;
NEW.title:=trim(NEW.title); NEW.action_custom:=nullif(trim(NEW.action_custom),'');
IF NEW.action_type='Outros' AND (NEW.action_custom IS NULL OR length(NEW.action_custom)>500) THEN RAISE EXCEPTION 'Descreva a ação Outros (até 500 caracteres).'; END IF;
IF NEW.start_date IS NOT NULL AND NEW.end_date IS NOT NULL AND NEW.end_date<NEW.start_date THEN RAISE EXCEPTION 'A data de término deve ser igual ou posterior ao início.'; END IF;
IF cardinality(NEW.responsible_ids)>50 OR cardinality(NEW.links)>30 THEN RAISE EXCEPTION 'Quantidade de responsáveis ou links inválida.'; END IF;
FOREACH rid IN ARRAY NEW.responsible_ids LOOP
 IF NOT EXISTS(SELECT 1 FROM public.opdesk_responsibles r JOIN public.profiles p ON p.id=r.user_id WHERE r.user_id=rid AND p.deleted_at IS NULL AND p.is_active) THEN RAISE EXCEPTION 'Responsável não cadastrado ou inativo.'; END IF;
END LOOP;
IF jsonb_typeof(NEW.agents)<>'array' OR jsonb_array_length(NEW.agents)>50 THEN RAISE EXCEPTION 'Lista de agentes inválida.'; END IF;
FOR agent IN SELECT value FROM jsonb_array_elements(NEW.agents) LOOP
 IF length(trim(coalesce(agent->>'name',''))) NOT BETWEEN 1 AND 180 OR coalesce(agent->>'status','') NOT IN('Executor responsável','Participante') THEN RAISE EXCEPTION 'Nome ou função do agente inválidos.'; END IF;
END LOOP;
IF EXISTS(SELECT 1 FROM unnest(NEW.links) v WHERE length(v)>2000 OR v !~* '^https?://[^[:space:]]+$') THEN RAISE EXCEPTION 'Os links devem ser endereços http ou https válidos.'; END IF;
IF TG_OP='UPDATE' THEN
 NEW.task_number:=OLD.task_number; NEW.created_by:=OLD.created_by; NEW.created_at:=OLD.created_at;
 IF NEW.parent_task_id IS DISTINCT FROM OLD.parent_task_id AND EXISTS(SELECT 1 FROM public.opdesk_tasks WHERE parent_task_id=OLD.id AND deleted_at IS NULL) THEN RAISE EXCEPTION 'Uma tarefa com sub-tarefas não pode virar sub-tarefa.'; END IF;
 IF NEW.client_id IS DISTINCT FROM OLD.client_id AND EXISTS(SELECT 1 FROM public.opdesk_tasks WHERE parent_task_id=OLD.id AND deleted_at IS NULL) THEN RAISE EXCEPTION 'Desvincule as sub-tarefas antes de mudar o cliente.'; END IF;
END IF;
IF NEW.parent_task_id IS NOT NULL THEN
 IF NEW.parent_task_id=NEW.id THEN RAISE EXCEPTION 'Uma tarefa não pode depender de si própria.'; END IF;
 SELECT * INTO parent FROM public.opdesk_tasks WHERE id=NEW.parent_task_id AND deleted_at IS NULL FOR UPDATE;
 IF parent.id IS NULL OR parent.parent_task_id IS NOT NULL OR parent.client_id<>NEW.client_id THEN RAISE EXCEPTION 'Selecione uma tarefa principal do mesmo cliente.'; END IF;
 IF public.opdesk_flow_blocks(NEW.flow_rule,NEW.status,parent.status) THEN RAISE EXCEPTION 'Alteração bloqueada: sub-tarefa % (%), regra %, incompatível com a principal em %.',NEW.title,NEW.status,NEW.flow_rule,parent.status; END IF;
 IF TG_OP='INSERT' THEN
  NEW.subtask_number:=parent.next_subtask_number; UPDATE public.opdesk_tasks SET next_subtask_number=next_subtask_number+1 WHERE id=parent.id;
 ELSIF NEW.parent_task_id IS DISTINCT FROM OLD.parent_task_id THEN
  NEW.subtask_number:=parent.next_subtask_number; UPDATE public.opdesk_tasks SET next_subtask_number=next_subtask_number+1 WHERE id=parent.id;
 ELSE NEW.subtask_number:=OLD.subtask_number; END IF;
ELSE
 NEW.subtask_number:=NULL; NEW.flow_rule:='Nenhuma';
 FOR child IN SELECT * FROM public.opdesk_tasks WHERE parent_task_id=NEW.id AND deleted_at IS NULL LOOP
 IF public.opdesk_flow_blocks(child.flow_rule,child.status,NEW.status) THEN RAISE EXCEPTION 'Alteração bloqueada: sub-tarefa % (%), regra %, impede a principal em %.',child.title,child.status,child.flow_rule,NEW.status; END IF;
 END LOOP;
END IF;
IF NEW.status='Concluída' THEN
 IF TG_OP='INSERT' THEN NEW.completed_at:=clock_timestamp();
 ELSIF OLD.status<>'Concluída' THEN NEW.completed_at:=clock_timestamp(); ELSE NEW.completed_at:=OLD.completed_at; END IF;
ELSE NEW.completed_at:=NULL; END IF;
NEW.updated_at:=clock_timestamp(); RETURN NEW;
END; $$;
CREATE TRIGGER opdesk_guard BEFORE INSERT OR UPDATE ON public.opdesk_tasks FOR EACH ROW EXECUTE FUNCTION public.opdesk_guard_task();
CREATE OR REPLACE FUNCTION public.opdesk_audit_task() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE actor text; k text; before_v jsonb; after_v jsonb; labels jsonb:='{"title":"Título","client_id":"Cliente","action_type":"Ação","action_custom":"Descrição da ação","start_date":"Data de início","end_date":"Data de término","priority":"Prioridade","status":"Status","responsible_ids":"Responsáveis","agents":"Agentes","links":"Links","parent_task_id":"Vínculo da tarefa principal","flow_rule":"Regra de fluxo","deleted_at":"Exclusão"}';
BEGIN
SELECT email INTO actor FROM public.profiles WHERE id=auth.uid(); actor:=coalesce(actor,'Automação do sistema');
IF TG_OP='INSERT' THEN INSERT INTO public.opdesk_task_logs(task_id,text,actor_id,actor_email) VALUES(NEW.id,'Tarefa criada: '||NEW.title,auth.uid(),actor); RETURN NEW; END IF;
FOR k IN SELECT jsonb_object_keys(labels) LOOP
 before_v:=to_jsonb(OLD)->k; after_v:=to_jsonb(NEW)->k;
 IF before_v IS DISTINCT FROM after_v THEN
 INSERT INTO public.opdesk_task_logs(task_id,text,actor_id,actor_email) VALUES(NEW.id,CASE WHEN auth.uid() IS NULL AND k='status' AND NEW.status='Fechado' THEN 'Status alterado automaticamente de Concluída para Fechado após 48 horas' ELSE labels->>k||' alterado de '||coalesce(before_v#>>'{}','—')||' para '||coalesce(after_v#>>'{}','—') END,auth.uid(),actor);
 END IF;
END LOOP; RETURN NEW;
END; $$;
CREATE TRIGGER opdesk_audit AFTER INSERT OR UPDATE ON public.opdesk_tasks FOR EACH ROW EXECUTE FUNCTION public.opdesk_audit_task();
CREATE OR REPLACE FUNCTION public.opdesk_save_task(_id uuid,_values jsonb,_expected_updated_at timestamptz DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE t public.opdesk_tasks; result public.opdesk_tasks; parent_id uuid;
BEGIN
IF NOT public.opdesk_has_access() THEN RAISE EXCEPTION 'Acesso negado ao OpDesk.'; END IF;
PERFORM pg_advisory_xact_lock(hashtext('opdesk_tasks_write'));
IF jsonb_typeof(_values)<>'object' THEN RAISE EXCEPTION 'Dados da tarefa inválidos.'; END IF;
IF _id IS NOT NULL THEN
 SELECT * INTO t FROM public.opdesk_tasks WHERE id=_id AND deleted_at IS NULL FOR UPDATE;
 IF t.id IS NULL THEN RAISE EXCEPTION 'Tarefa não encontrada.'; END IF;
 IF _expected_updated_at IS NULL OR t.updated_at IS DISTINCT FROM _expected_updated_at THEN RAISE EXCEPTION 'A tarefa foi atualizada. Reabra antes de salvar.'; END IF;
END IF;
parent_id:=nullif(_values->>'parent_task_id','')::uuid;
IF _id IS NULL THEN
 INSERT INTO public.opdesk_tasks(client_id,title,action_type,action_custom,start_date,end_date,priority,status,responsible_ids,agents,links,parent_task_id,flow_rule,created_by) VALUES((_values->>'client_id')::uuid,_values->>'title',_values->>'action_type',_values->>'action_custom',nullif(_values->>'start_date','')::date,nullif(_values->>'end_date','')::date,coalesce(_values->>'priority','Média'),coalesce(_values->>'status','Pendente'),ARRAY(SELECT jsonb_array_elements_text(coalesce(_values->'responsible_ids','[]'))::uuid),coalesce(_values->'agents','[]'),ARRAY(SELECT jsonb_array_elements_text(coalesce(_values->'links','[]'))),parent_id,coalesce(_values->>'flow_rule','Nenhuma'),auth.uid()) RETURNING * INTO result;
ELSE
 UPDATE public.opdesk_tasks SET client_id=(_values->>'client_id')::uuid,title=_values->>'title',action_type=_values->>'action_type',action_custom=_values->>'action_custom',start_date=nullif(_values->>'start_date','')::date,end_date=nullif(_values->>'end_date','')::date,priority=_values->>'priority',status=_values->>'status',responsible_ids=ARRAY(SELECT jsonb_array_elements_text(coalesce(_values->'responsible_ids','[]'))::uuid),agents=coalesce(_values->'agents','[]'),links=ARRAY(SELECT jsonb_array_elements_text(coalesce(_values->'links','[]'))),parent_task_id=parent_id,flow_rule=coalesce(_values->>'flow_rule','Nenhuma') WHERE id=_id RETURNING * INTO result;
END IF;
RETURN to_jsonb(result);
END; $$;
REVOKE ALL ON FUNCTION public.opdesk_save_task(uuid,jsonb,timestamptz) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.opdesk_save_task(uuid,jsonb,timestamptz) TO authenticated;
CREATE OR REPLACE FUNCTION public.opdesk_delete_task(_id uuid,_expected_updated_at timestamptz) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE t public.opdesk_tasks;
BEGIN
IF NOT public.opdesk_has_access() THEN RAISE EXCEPTION 'Acesso negado ao OpDesk.'; END IF;
PERFORM pg_advisory_xact_lock(hashtext('opdesk_tasks_write'));
SELECT * INTO t FROM public.opdesk_tasks WHERE id=_id AND deleted_at IS NULL FOR UPDATE;
IF t.id IS NULL OR t.updated_at IS DISTINCT FROM _expected_updated_at THEN RAISE EXCEPTION 'A tarefa mudou. Reabra antes de excluir.'; END IF;
UPDATE public.opdesk_tasks SET deleted_at=clock_timestamp() WHERE id=_id;
END; $$;
REVOKE ALL ON FUNCTION public.opdesk_delete_task(uuid,timestamptz) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.opdesk_delete_task(uuid,timestamptz) TO authenticated;
CREATE OR REPLACE FUNCTION public.opdesk_add_observation(_task_id uuid,_text text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE result uuid; actor text;
BEGIN
IF NOT public.opdesk_has_access() OR NOT EXISTS(SELECT 1 FROM public.opdesk_tasks WHERE id=_task_id AND deleted_at IS NULL) THEN RAISE EXCEPTION 'Acesso negado à tarefa.'; END IF;
SELECT email INTO actor FROM public.profiles WHERE id=auth.uid();
INSERT INTO public.opdesk_task_observations(task_id,text,author_id,author_email) VALUES(_task_id,trim(_text),auth.uid(),coalesce(actor,'Usuário')) RETURNING id INTO result;
INSERT INTO public.opdesk_task_logs(task_id,text,actor_id,actor_email) VALUES(_task_id,'Observação registrada: '||trim(_text),auth.uid(),coalesce(actor,'Usuário'));
RETURN result;
END; $$;
REVOKE ALL ON FUNCTION public.opdesk_add_observation(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.opdesk_add_observation(uuid,text) TO authenticated;
CREATE OR REPLACE FUNCTION public.opdesk_guard_responsible_delete() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN IF EXISTS(SELECT 1 FROM public.opdesk_tasks WHERE OLD.user_id=ANY(responsible_ids) AND deleted_at IS NULL) THEN RAISE EXCEPTION 'Responsável vinculado a tarefas; retire os vínculos antes de remover.'; END IF; RETURN OLD; END; $$;
CREATE TRIGGER opdesk_responsible_delete BEFORE DELETE ON public.opdesk_responsibles FOR EACH ROW EXECUTE FUNCTION public.opdesk_guard_responsible_delete();
CREATE OR REPLACE FUNCTION public.opdesk_close_completed() RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE n integer;
BEGIN
PERFORM pg_advisory_xact_lock(hashtext('opdesk_tasks_write'));
UPDATE public.opdesk_tasks t SET status='Fechado' WHERE t.deleted_at IS NULL AND t.status='Concluída' AND t.completed_at<clock_timestamp()-interval '48 hours' AND NOT EXISTS(SELECT 1 FROM public.opdesk_tasks s WHERE s.parent_task_id=t.id AND s.deleted_at IS NULL AND public.opdesk_flow_blocks(s.flow_rule,s.status,'Fechado'));
GET DIAGNOSTICS n=ROW_COUNT; RETURN n;
END; $$;
REVOKE ALL ON FUNCTION public.opdesk_close_completed() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.opdesk_close_completed() TO service_role;