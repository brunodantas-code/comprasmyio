ALTER TABLE public.legal_actions ADD COLUMN due_date date;
ALTER TABLE public.legal_action_observations ADD COLUMN deleted_at timestamptz;
CREATE OR REPLACE FUNCTION public.guard_legal_action_observation() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF TG_OP='INSERT' THEN NEW.author_id:=auth.uid(); NEW.created_at:=now(); NEW.deleted_at:=NULL;
 ELSE
  NEW.id:=OLD.id; NEW.author_id:=OLD.author_id; NEW.created_at:=OLD.created_at; NEW.action_id:=OLD.action_id;
  IF OLD.deleted_at IS NOT NULL THEN RAISE EXCEPTION 'Observação excluída não pode ser alterada'; END IF;
  IF NEW.deleted_at IS NOT NULL THEN NEW.deleted_at:=now(); NEW.message:=OLD.message; END IF;
 END IF;
 SELECT full_name INTO NEW.author_name FROM public.profiles WHERE id=NEW.author_id;
 NEW.updated_at:=now(); RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION public.audit_legal_action_tracking() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE a public.legal_actions; message_value text; actor text;
BEGIN
 SELECT full_name INTO actor FROM public.profiles WHERE id=auth.uid();
 IF TG_TABLE_NAME='legal_actions' THEN
  a:=NEW;
  IF TG_OP='INSERT' THEN message_value:='Ação adicionada: '||NEW.title||E'\nResponsável: '||NEW.responsible_name||E'\nPrazo: '||coalesce(to_char(NEW.due_date,'DD/MM/YYYY'),'Não informado');
  ELSIF NEW.archived IS DISTINCT FROM OLD.archived THEN message_value:='Ação arquivada: '||NEW.title;
  ELSIF NEW.completed_at IS DISTINCT FROM OLD.completed_at THEN message_value:='Ação '||CASE WHEN NEW.completed_at IS NULL THEN 'reaberta: ' ELSE 'concluída: ' END||NEW.title;
  ELSE message_value:='Ação alterada'||E'\nAntes: '||OLD.title||' / '||OLD.responsible_name||' / Prazo: '||coalesce(to_char(OLD.due_date,'DD/MM/YYYY'),'Não informado')||E'\nDepois: '||NEW.title||' / '||NEW.responsible_name||' / Prazo: '||coalesce(to_char(NEW.due_date,'DD/MM/YYYY'),'Não informado'); END IF;
 ELSE
  SELECT * INTO a FROM public.legal_actions WHERE id=NEW.action_id;
  IF TG_OP='INSERT' THEN message_value:='Observação adicionada: '||NEW.message;
  ELSIF NEW.deleted_at IS DISTINCT FROM OLD.deleted_at THEN message_value:='Observação excluída: '||OLD.message;
  ELSE message_value:='Observação alterada'||E'\nAntes: '||OLD.message||E'\nDepois: '||NEW.message; END IF;
 END IF;
 INSERT INTO public.legal_subject_logs(record_id,subject_id,action_id,actor_id,actor_name,text) VALUES(a.record_id,a.subject_id,a.id,auth.uid(),coalesce(actor,'Usuário'),message_value||E'\npor '||coalesce(actor,'Usuário'));
 RETURN NEW;
END $$;