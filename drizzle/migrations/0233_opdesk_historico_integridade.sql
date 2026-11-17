CREATE OR REPLACE FUNCTION public.opdesk_audit_task() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE actor text; k text; before_v jsonb; after_v jsonb; labels jsonb:='{"title":"Título","client_id":"Cliente","action_type":"Ação","action_custom":"Descrição da ação","start_date":"Data de início","end_date":"Data de término","priority":"Prioridade","status":"Status","responsible_ids":"Responsáveis","agents":"Agentes","links":"Links","parent_task_id":"Vínculo da tarefa principal","flow_rule":"Regra de fluxo","deleted_at":"Exclusão"}';
BEGIN
SELECT email INTO actor FROM public.profiles WHERE id=auth.uid(); actor:=coalesce(actor,'Automação do sistema');
IF TG_OP='INSERT' THEN INSERT INTO public.opdesk_task_logs(task_id,text,actor_id,actor_email) VALUES(NEW.id,'Tarefa criada: '||NEW.title,auth.uid(),actor); RETURN NEW; END IF;
FOR k IN SELECT jsonb_object_keys(labels) LOOP
 before_v:=to_jsonb(OLD)->k; after_v:=to_jsonb(NEW)->k;
 IF before_v IS DISTINCT FROM after_v THEN
 INSERT INTO public.opdesk_task_logs(task_id,text,actor_id,actor_email) VALUES(NEW.id,CASE WHEN auth.uid() IS NULL AND k='status' AND NEW.status='Fechado' THEN 'Status alterado automaticamente de Concluída para Fechado após 48 horas' ELSE (labels->>k)||' alterado de '||coalesce(before_v#>>'{}','—')||' para '||coalesce(after_v#>>'{}','—') END,auth.uid(),actor);
 END IF;
END LOOP; RETURN NEW;
END; $$;
CREATE OR REPLACE FUNCTION public.opdesk_remove_responsible(_user_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN IF NOT public.opdesk_has_access() THEN RAISE EXCEPTION 'Acesso negado ao OpDesk.'; END IF; PERFORM pg_advisory_xact_lock(hashtext('opdesk_tasks_write')); DELETE FROM public.opdesk_responsibles WHERE user_id=_user_id; END; $$;
REVOKE DELETE ON public.opdesk_responsibles FROM authenticated;
REVOKE ALL ON FUNCTION public.opdesk_remove_responsible(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.opdesk_remove_responsible(uuid) TO authenticated;
CREATE OR REPLACE FUNCTION public.opdesk_audit_attachment() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE actor text; BEGIN SELECT email INTO actor FROM public.profiles WHERE id=auth.uid(); IF TG_OP='DELETE' THEN INSERT INTO public.opdesk_task_logs(task_id,text,actor_id,actor_email) VALUES(OLD.task_id,'Anexo removido: '||OLD.file_name,auth.uid(),coalesce(actor,'Automação do sistema')); RETURN OLD; ELSE INSERT INTO public.opdesk_task_logs(task_id,text,actor_id,actor_email) VALUES(NEW.task_id,'Anexo adicionado: '||NEW.file_name,auth.uid(),coalesce(actor,'Automação do sistema')); RETURN NEW; END IF; END; $$;
CREATE TRIGGER opdesk_attachment_audit AFTER INSERT OR DELETE ON public.opdesk_task_attachments FOR EACH ROW EXECUTE FUNCTION public.opdesk_audit_attachment();