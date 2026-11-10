CREATE TABLE public.central_dependencies (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), predecessor_kind text NOT NULL, predecessor_id text NOT NULL,
 successor_kind text NOT NULL, successor_id text NOT NULL, milestone text NOT NULL DEFAULT 'completed',
 created_by uuid NOT NULL DEFAULT auth.uid(), created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(predecessor_kind,predecessor_id,successor_kind,successor_id),
 CHECK(predecessor_kind IN ('code','legal_action','legal_subject','legal_signature','supply','mytosis_node','mytosis_task','support','user_deletion')),
 CHECK(successor_kind IN ('code','legal_action','legal_subject','legal_signature','supply','mytosis_node','mytosis_task','support','user_deletion')),
 CHECK(milestone IN ('completed','approved','purchased','received')),
 CHECK(predecessor_kind<>successor_kind OR predecessor_id<>successor_id)
);
GRANT SELECT,INSERT,UPDATE,DELETE ON public.central_dependencies TO authenticated;
GRANT ALL ON public.central_dependencies TO service_role;
ALTER TABLE public.central_dependencies ENABLE ROW LEVEL SECURITY;
CREATE POLICY central_dependencies_admin ON public.central_dependencies FOR ALL TO authenticated USING(public.is_access_admin(auth.uid())) WITH CHECK(public.is_access_admin(auth.uid()));
CREATE TABLE public.central_dependency_logs(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), dependency_id uuid NOT NULL, actor_id uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), action text NOT NULL, before_value jsonb, after_value jsonb);
GRANT SELECT ON public.central_dependency_logs TO authenticated;
GRANT ALL ON public.central_dependency_logs TO service_role;
ALTER TABLE public.central_dependency_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY central_logs_admin ON public.central_dependency_logs FOR SELECT TO authenticated USING(public.is_access_admin(auth.uid()));
CREATE FUNCTION public.central_source_exists(k text,i text) RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$ BEGIN
 CASE k
 WHEN 'code' THEN RETURN EXISTS(SELECT 1 FROM public.development_tickets WHERE id::text=i);
 WHEN 'legal_action' THEN RETURN EXISTS(SELECT 1 FROM public.legal_actions WHERE id::text=i AND NOT archived);
 WHEN 'legal_subject' THEN RETURN EXISTS(SELECT 1 FROM public.legal_records r CROSS JOIN LATERAL jsonb_array_elements(coalesce(r.content->'subjects','[]')) s WHERE r.id::text||'/'||(s->>'id')=i) OR EXISTS(SELECT 1 FROM public.legal_confidential_subjects WHERE record_id::text||'/'||subject_id=i);
 WHEN 'legal_signature' THEN RETURN EXISTS(SELECT 1 FROM public.legal_records r CROSS JOIN LATERAL jsonb_array_elements(coalesce(r.content->'participants','[]')) p WHERE r.id::text||'/'||(p->>'id')=i);
 WHEN 'supply' THEN RETURN EXISTS(SELECT 1 FROM public.purchase_orders WHERE id::text=i);
 WHEN 'mytosis_node' THEN RETURN EXISTS(SELECT 1 FROM public.mytosis_nodes WHERE id::text=i AND NOT is_process);
 WHEN 'mytosis_task' THEN RETURN EXISTS(SELECT 1 FROM public.mytosis_tasks t JOIN public.mytosis_nodes n ON n.id=t.node_id WHERE t.id::text=i AND NOT n.is_process);
 WHEN 'support' THEN RETURN EXISTS(SELECT 1 FROM public.internal_calls WHERE id::text=i);
 WHEN 'user_deletion' THEN RETURN EXISTS(SELECT 1 FROM public.user_deletion_requests WHERE id::text=i);
 ELSE RETURN false; END CASE;
 END $$;
REVOKE ALL ON FUNCTION public.central_source_exists(text,text) FROM PUBLIC;
CREATE FUNCTION public.guard_central_dependency() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 IF NOT coalesce(public.is_access_admin(auth.uid()),false) THEN RAISE EXCEPTION 'Somente Admin pode alterar dependências'; END IF;
 PERFORM pg_advisory_xact_lock(82749102);
 IF NOT public.central_source_exists(NEW.predecessor_kind,NEW.predecessor_id) OR NOT public.central_source_exists(NEW.successor_kind,NEW.successor_id) THEN RAISE EXCEPTION 'Pendência não encontrada ou removida'; END IF;
 IF NEW.predecessor_kind<>'supply' AND NEW.milestone<>'completed' THEN RAISE EXCEPTION 'Este marco só é permitido para pedidos'; END IF;
 IF EXISTS(WITH RECURSIVE paths(k,i) AS (SELECT NEW.successor_kind,NEW.successor_id UNION SELECT d.successor_kind,d.successor_id FROM public.central_dependencies d JOIN paths p ON d.predecessor_kind=p.k AND d.predecessor_id=p.i WHERE d.id<>NEW.id) SELECT 1 FROM paths WHERE k=NEW.predecessor_kind AND i=NEW.predecessor_id) THEN RAISE EXCEPTION 'Dependência circular não permitida'; END IF;
 IF TG_OP='INSERT' THEN NEW.created_by:=auth.uid(); ELSE NEW.created_by:=OLD.created_by; NEW.created_at:=OLD.created_at; END IF;
 RETURN NEW; END $$;
CREATE TRIGGER central_dependency_guard BEFORE INSERT OR UPDATE ON public.central_dependencies FOR EACH ROW EXECUTE FUNCTION public.guard_central_dependency();
CREATE FUNCTION public.audit_central_dependency() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 INSERT INTO public.central_dependency_logs(dependency_id,actor_id,action,before_value,after_value) VALUES(CASE WHEN TG_OP='DELETE' THEN OLD.id ELSE NEW.id END,auth.uid(),TG_OP,CASE WHEN TG_OP<>'INSERT' THEN to_jsonb(OLD) END,CASE WHEN TG_OP<>'DELETE' THEN to_jsonb(NEW) END);
 IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF; END $$;
CREATE TRIGGER central_dependency_audit AFTER INSERT OR UPDATE OR DELETE ON public.central_dependencies FOR EACH ROW EXECUTE FUNCTION public.audit_central_dependency();
CREATE FUNCTION public.central_admin_snapshot() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$ DECLARE result jsonb; BEGIN
 IF auth.uid() IS NULL OR NOT coalesce(public.is_access_admin(auth.uid()),false) THEN RAISE EXCEPTION 'Acesso exclusivo para Admin' USING ERRCODE='42501'; END IF;
 SELECT jsonb_build_object(
 'users',(SELECT coalesce(jsonb_agg(to_jsonb(x)),'[]') FROM (SELECT p.id,p.full_name,public.is_erp_admin(p.id) AS code_admin,EXISTS(SELECT 1 FROM public.user_app_access a WHERE a.user_id=p.id AND a.app_key='development') AS code_access,public.is_supply_member(p.id) AS buyer FROM public.profiles p WHERE p.deleted_at IS NULL AND p.is_active) x),
 'code',(SELECT coalesce(jsonb_agg(to_jsonb(x)),'[]') FROM (SELECT id,ticket_number,title,reporter_id,assignee_id,status,priority,urgency,created_at FROM public.development_tickets) x),
 'codeMessages',(SELECT coalesce(jsonb_agg(to_jsonb(x)),'[]') FROM (SELECT id,ticket_id,author_id,message_type,parent_message_id,recipient_id,requester_seen_at FROM public.development_ticket_messages) x),
 'orders',(SELECT coalesce(jsonb_agg(to_jsonb(x)),'[]') FROM (SELECT id,approval_number,item_name,requester_id,recipient_user_id,request_type,request_model,status,approval_status,deadline_type,deadline_date,delivery_forecast,created_at FROM public.purchase_orders) x),
 'steps',(SELECT coalesce(jsonb_agg(to_jsonb(x)),'[]') FROM (SELECT id,order_id,approver_id,status,step_index,role_label FROM public.approval_steps) x),
 'supplyMessages',(SELECT coalesce(jsonb_agg(to_jsonb(x)),'[]') FROM (SELECT id,order_id,author_id,message_type,parent_message_id,recipient_id FROM public.supply_order_messages) x),
 'records',(SELECT coalesce(jsonb_agg(to_jsonb(x)),'[]') FROM (SELECT id,title,content,created_by FROM public.legal_records WHERE category='minutes') x),
 'confidential',(SELECT coalesce(jsonb_agg(to_jsonb(x)),'[]') FROM (SELECT record_id,subject_id,position,subject FROM public.legal_confidential_subjects) x),
 'actions',(SELECT coalesce(jsonb_agg(to_jsonb(x)),'[]') FROM (SELECT id,record_id,subject_id,title,responsible_id,responsible_name,completed_at,archived,due_date FROM public.legal_actions) x),
 'completions',(SELECT coalesce(jsonb_agg(to_jsonb(x)),'[]') FROM (SELECT record_id,subject_id FROM public.legal_subject_completions) x),
 'nodes',(SELECT coalesce(jsonb_agg(to_jsonb(x)),'[]') FROM (SELECT id,title,responsible_id,due_date,progress,is_process FROM public.mytosis_nodes WHERE NOT is_process) x),
 'tasks',(SELECT coalesce(jsonb_agg(to_jsonb(x)),'[]') FROM (SELECT t.id,t.title,t.responsible_id,t.due_date,t.completed,t.node_id FROM public.mytosis_tasks t JOIN public.mytosis_nodes n ON n.id=t.node_id WHERE NOT n.is_process) x),
 'nodeMessages',(SELECT coalesce(jsonb_agg(to_jsonb(x)),'[]') FROM (SELECT m.id,m.node_id,m.author_id,m.kind,m.reply_to_id,m.recipient_id FROM public.mytosis_node_messages m JOIN public.mytosis_nodes n ON n.id=m.node_id WHERE NOT n.is_process) x),
 'taskMessages',(SELECT coalesce(jsonb_agg(to_jsonb(x)),'[]') FROM (SELECT m.id,m.task_id,m.author_id,m.kind,m.reply_to_id,m.recipient_id FROM public.mytosis_task_messages m JOIN public.mytosis_tasks t ON t.id=m.task_id JOIN public.mytosis_nodes n ON n.id=t.node_id WHERE NOT n.is_process) x),
 'support',(SELECT coalesce(jsonb_agg(to_jsonb(x)),'[]') FROM (SELECT id,title,status,reporter_id,assignee_id,priority FROM public.internal_calls) x),
 'deletions',(SELECT coalesce(jsonb_agg(to_jsonb(x)),'[]') FROM (SELECT id,requested_by,status FROM public.user_deletion_requests) x),
 'dependencies',(SELECT coalesce(jsonb_agg(to_jsonb(d)),'[]') FROM public.central_dependencies d),
 'logs',(SELECT coalesce(jsonb_agg(to_jsonb(x)),'[]') FROM (SELECT * FROM public.central_dependency_logs ORDER BY created_at DESC LIMIT 200) x)
 ) INTO result; RETURN result; END $$;
REVOKE ALL ON FUNCTION public.central_admin_snapshot() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.central_admin_snapshot() TO authenticated;