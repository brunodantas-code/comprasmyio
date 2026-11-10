CREATE OR REPLACE FUNCTION public.central_admin_snapshot() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$ DECLARE result jsonb; BEGIN
 IF auth.uid() IS NULL OR NOT coalesce(public.is_access_admin(auth.uid()),false) THEN RAISE EXCEPTION 'Acesso exclusivo para Admin' USING ERRCODE='42501'; END IF;
 SELECT jsonb_build_object(
 'users',(SELECT coalesce(jsonb_agg(to_jsonb(x)),'[]') FROM (SELECT p.id,p.full_name,public.is_erp_admin(p.id) AS code_admin,EXISTS(SELECT 1 FROM public.user_app_access a WHERE a.user_id=p.id AND a.app_key='development') AS code_access,EXISTS(SELECT 1 FROM public.job_titles jt WHERE jt.active AND lower(jt.name) LIKE '%supply%' AND public.has_job_title(p.id,jt.id)) AS buyer, EXISTS(SELECT 1 FROM public.job_titles jt WHERE jt.active AND jt.name='Analista de Suporte ao Cliente' AND public.has_job_title(p.id,jt.id)) AS support_agent FROM public.profiles p WHERE p.deleted_at IS NULL AND p.is_active) x),
 'code',(SELECT coalesce(jsonb_agg(to_jsonb(x)),'[]') FROM (SELECT id,ticket_number,title,reporter_id,assignee_id,status,priority,urgency,created_at FROM public.development_tickets) x),
 'codeMessages',(SELECT coalesce(jsonb_agg(to_jsonb(x)),'[]') FROM (SELECT id,ticket_id,author_id,message_type,parent_message_id,recipient_id,requester_seen_at FROM public.development_ticket_messages) x),
 'payments',(SELECT coalesce(jsonb_agg(to_jsonb(x)),'[]') FROM (SELECT source_order_id,status,due_date FROM public.cash_flow_payables) x),
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