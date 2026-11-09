CREATE TABLE public.legal_actions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), record_id uuid NOT NULL REFERENCES public.legal_records(id) ON DELETE CASCADE,
 subject_id text NOT NULL, title text NOT NULL CHECK(length(trim(title)) BETWEEN 1 AND 1000), responsible_id uuid NOT NULL, responsible_name text NOT NULL,
 sequence integer NOT NULL DEFAULT 1, completed_at timestamptz, completed_by uuid, created_by uuid NOT NULL DEFAULT auth.uid(), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), archived boolean NOT NULL DEFAULT false
);
GRANT SELECT,INSERT,UPDATE ON public.legal_actions TO authenticated;
GRANT ALL ON public.legal_actions TO service_role;
ALTER TABLE public.legal_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY legal_actions_read ON public.legal_actions FOR SELECT TO authenticated USING (EXISTS(SELECT 1 FROM public.legal_records r WHERE r.id=record_id));
CREATE POLICY legal_actions_insert ON public.legal_actions FOR INSERT TO authenticated WITH CHECK(created_by=auth.uid() AND EXISTS(SELECT 1 FROM public.legal_records r WHERE r.id=record_id));
CREATE POLICY legal_actions_update ON public.legal_actions FOR UPDATE TO authenticated USING(EXISTS(SELECT 1 FROM public.legal_records r WHERE r.id=record_id)) WITH CHECK(EXISTS(SELECT 1 FROM public.legal_records r WHERE r.id=record_id));
CREATE TABLE public.legal_action_observations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), action_id uuid NOT NULL REFERENCES public.legal_actions(id), message text NOT NULL CHECK(length(trim(message)) BETWEEN 1 AND 4000), author_id uuid NOT NULL DEFAULT auth.uid(), author_name text NOT NULL DEFAULT '', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT,INSERT,UPDATE ON public.legal_action_observations TO authenticated;
GRANT ALL ON public.legal_action_observations TO service_role;
ALTER TABLE public.legal_action_observations ENABLE ROW LEVEL SECURITY;
CREATE POLICY legal_observations_read ON public.legal_action_observations FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.legal_actions a WHERE a.id=action_id));
CREATE POLICY legal_observations_insert ON public.legal_action_observations FOR INSERT TO authenticated WITH CHECK(author_id=auth.uid() AND EXISTS(SELECT 1 FROM public.legal_actions a WHERE a.id=action_id AND NOT a.archived));
CREATE POLICY legal_observations_update ON public.legal_action_observations FOR UPDATE TO authenticated USING(author_id=auth.uid() AND EXISTS(SELECT 1 FROM public.legal_actions a WHERE a.id=action_id AND NOT a.archived)) WITH CHECK(author_id=auth.uid());
CREATE TABLE public.legal_subject_logs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), record_id uuid NOT NULL REFERENCES public.legal_records(id) ON DELETE CASCADE, subject_id text NOT NULL, action_id uuid REFERENCES public.legal_actions(id), actor_id uuid NOT NULL, actor_name text NOT NULL, text text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.legal_subject_logs TO authenticated;
GRANT ALL ON public.legal_subject_logs TO service_role;
ALTER TABLE public.legal_subject_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY legal_subject_logs_read ON public.legal_subject_logs FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.legal_records r WHERE r.id=record_id));
CREATE FUNCTION public.guard_legal_action() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE owner_name text;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.legal_records r CROSS JOIN LATERAL jsonb_array_elements(coalesce(r.content->'subjects','[]'::jsonb)) s WHERE r.id=NEW.record_id AND s->>'id'=NEW.subject_id AND r.category='minutes') THEN RAISE EXCEPTION 'Salve o Assunto antes de adicionar ações'; END IF;
 SELECT full_name INTO owner_name FROM public.legal_participant_users() WHERE id=NEW.responsible_id;
 IF owner_name IS NULL THEN RAISE EXCEPTION 'Selecione um responsável válido'; END IF;
 NEW.responsible_name:=owner_name;
 IF TG_OP='INSERT' THEN
  NEW.created_by:=auth.uid(); NEW.created_at:=now();
  PERFORM pg_advisory_xact_lock(hashtext(NEW.record_id::text||NEW.subject_id));
  SELECT coalesce(max(sequence),0)+1 INTO NEW.sequence FROM public.legal_actions WHERE record_id=NEW.record_id AND subject_id=NEW.subject_id;
  NEW.completed_at:=NULL; NEW.completed_by:=NULL;
 ELSE
  NEW.id:=OLD.id; NEW.record_id:=OLD.record_id; NEW.subject_id:=OLD.subject_id; NEW.created_by:=OLD.created_by; NEW.created_at:=OLD.created_at; NEW.sequence:=OLD.sequence;
  IF (NEW.completed_at IS NULL) IS DISTINCT FROM (OLD.completed_at IS NULL) THEN NEW.completed_at:=CASE WHEN NEW.completed_at IS NULL THEN NULL ELSE now() END; NEW.completed_by:=CASE WHEN NEW.completed_at IS NULL THEN NULL ELSE auth.uid() END;
  ELSE NEW.completed_at:=OLD.completed_at; NEW.completed_by:=OLD.completed_by; END IF;
 END IF;
 NEW.updated_at:=now(); RETURN NEW;
END $$;
CREATE TRIGGER guard_legal_action BEFORE INSERT OR UPDATE ON public.legal_actions FOR EACH ROW EXECUTE FUNCTION public.guard_legal_action();
CREATE FUNCTION public.guard_legal_action_observation() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF TG_OP='INSERT' THEN NEW.author_id:=auth.uid(); NEW.created_at:=now(); ELSE NEW.author_id:=OLD.author_id; NEW.created_at:=OLD.created_at; NEW.action_id:=OLD.action_id; END IF;
 SELECT full_name INTO NEW.author_name FROM public.profiles WHERE id=NEW.author_id;
 NEW.updated_at:=now(); RETURN NEW;
END $$;
CREATE TRIGGER guard_legal_action_observation BEFORE INSERT OR UPDATE ON public.legal_action_observations FOR EACH ROW EXECUTE FUNCTION public.guard_legal_action_observation();
CREATE FUNCTION public.audit_legal_action_tracking() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE a public.legal_actions; message_value text; actor text;
BEGIN
 SELECT full_name INTO actor FROM public.profiles WHERE id=auth.uid();
 IF TG_TABLE_NAME='legal_actions' THEN
  a:=NEW;
  IF TG_OP='INSERT' THEN message_value:='Ação adicionada: '||NEW.title||E'\nResponsável: '||NEW.responsible_name;
  ELSIF NEW.archived IS DISTINCT FROM OLD.archived THEN message_value:='Ação arquivada: '||NEW.title;
  ELSIF NEW.completed_at IS DISTINCT FROM OLD.completed_at THEN message_value:='Ação '||CASE WHEN NEW.completed_at IS NULL THEN 'reaberta: ' ELSE 'concluída: ' END||NEW.title;
  ELSE message_value:='Ação alterada'||E'\nAntes: '||OLD.title||' / '||OLD.responsible_name||E'\nDepois: '||NEW.title||' / '||NEW.responsible_name; END IF;
 ELSE
  SELECT * INTO a FROM public.legal_actions WHERE id=NEW.action_id;
  message_value:=CASE WHEN TG_OP='INSERT' THEN 'Observação adicionada: '||NEW.message ELSE 'Observação alterada'||E'\nAntes: '||OLD.message||E'\nDepois: '||NEW.message END;
 END IF;
 INSERT INTO public.legal_subject_logs(record_id,subject_id,action_id,actor_id,actor_name,text) VALUES(a.record_id,a.subject_id,a.id,auth.uid(),coalesce(actor,'Usuário'),message_value||E'\npor '||coalesce(actor,'Usuário'));
 RETURN NEW;
END $$;
CREATE TRIGGER audit_legal_actions AFTER INSERT OR UPDATE ON public.legal_actions FOR EACH ROW EXECUTE FUNCTION public.audit_legal_action_tracking();
CREATE TRIGGER audit_legal_observations AFTER INSERT OR UPDATE ON public.legal_action_observations FOR EACH ROW EXECUTE FUNCTION public.audit_legal_action_tracking();