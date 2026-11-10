CREATE TABLE public.legal_confidential_subjects (
 record_id uuid NOT NULL REFERENCES public.legal_records(id) ON DELETE CASCADE,
 subject_id text NOT NULL,
 position integer NOT NULL DEFAULT 0,
 subject jsonb NOT NULL,
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (record_id, subject_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.legal_confidential_subjects TO authenticated;
GRANT ALL ON public.legal_confidential_subjects TO service_role;
ALTER TABLE public.legal_confidential_subjects ENABLE ROW LEVEL SECURITY;
CREATE POLICY legal_confidential_subjects_admin ON public.legal_confidential_subjects FOR ALL TO authenticated
 USING (public.has_role(auth.uid(),'admin') AND EXISTS(SELECT 1 FROM public.legal_records r WHERE r.id=record_id))
 WITH CHECK (public.has_role(auth.uid(),'admin') AND EXISTS(SELECT 1 FROM public.legal_records r WHERE r.id=record_id AND r.category='minutes'));

CREATE FUNCTION public.legal_subject_visible(_record_id uuid, _subject_id text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT public.has_role(auth.uid(),'admin') OR NOT EXISTS(SELECT 1 FROM public.legal_confidential_subjects c WHERE c.record_id=_record_id AND c.subject_id=_subject_id);
$$;

DROP POLICY legal_actions_read ON public.legal_actions;
CREATE POLICY legal_actions_read ON public.legal_actions FOR SELECT TO authenticated USING (EXISTS(SELECT 1 FROM public.legal_records r WHERE r.id=record_id) AND public.legal_subject_visible(record_id, subject_id));
DROP POLICY legal_actions_insert ON public.legal_actions;
CREATE POLICY legal_actions_insert ON public.legal_actions FOR INSERT TO authenticated WITH CHECK (created_by=auth.uid() AND EXISTS(SELECT 1 FROM public.legal_records r WHERE r.id=record_id) AND public.legal_subject_visible(record_id, subject_id));
DROP POLICY legal_actions_update ON public.legal_actions;
CREATE POLICY legal_actions_update ON public.legal_actions FOR UPDATE TO authenticated USING (EXISTS(SELECT 1 FROM public.legal_records r WHERE r.id=record_id) AND public.legal_subject_visible(record_id, subject_id)) WITH CHECK (EXISTS(SELECT 1 FROM public.legal_records r WHERE r.id=record_id) AND public.legal_subject_visible(record_id, subject_id));
DROP POLICY legal_subject_logs_read ON public.legal_subject_logs;
CREATE POLICY legal_subject_logs_read ON public.legal_subject_logs FOR SELECT TO authenticated USING (EXISTS(SELECT 1 FROM public.legal_records r WHERE r.id=record_id) AND public.legal_subject_visible(record_id, subject_id));
DROP POLICY legal_subject_completions_read ON public.legal_subject_completions;
CREATE POLICY legal_subject_completions_read ON public.legal_subject_completions FOR SELECT TO authenticated USING (EXISTS(SELECT 1 FROM public.legal_records r WHERE r.id=record_id) AND public.legal_subject_visible(record_id, subject_id));
DROP POLICY legal_subject_completions_insert ON public.legal_subject_completions;
CREATE POLICY legal_subject_completions_insert ON public.legal_subject_completions FOR INSERT TO authenticated WITH CHECK (completed_by=auth.uid() AND EXISTS(SELECT 1 FROM public.legal_records r WHERE r.id=record_id AND r.category='minutes') AND public.legal_subject_visible(record_id, subject_id));
DROP POLICY legal_subject_completions_delete ON public.legal_subject_completions;
CREATE POLICY legal_subject_completions_delete ON public.legal_subject_completions FOR DELETE TO authenticated USING (EXISTS(SELECT 1 FROM public.legal_records r WHERE r.id=record_id) AND public.legal_subject_visible(record_id, subject_id));

CREATE OR REPLACE FUNCTION public.guard_legal_action() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE owner_name text;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.legal_records r CROSS JOIN LATERAL jsonb_array_elements(coalesce(r.content->'subjects','[]'::jsonb)) s WHERE r.id=NEW.record_id AND s->>'id'=NEW.subject_id AND r.category='minutes')
  AND NOT EXISTS(SELECT 1 FROM public.legal_confidential_subjects c WHERE c.record_id=NEW.record_id AND c.subject_id=NEW.subject_id) THEN RAISE EXCEPTION 'Salve o Assunto antes de adicionar ações'; END IF;
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

CREATE FUNCTION public.audit_legal_confidential_subject() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE actor text; rid uuid; sid text; msg text;
BEGIN
 SELECT full_name INTO actor FROM public.profiles WHERE id=auth.uid();
 IF TG_OP='DELETE' THEN rid:=OLD.record_id; sid:=OLD.subject_id; msg:='Assunto deixou de ser confidencial ou foi removido';
 ELSE rid:=NEW.record_id; sid:=NEW.subject_id;
  IF TG_OP='INSERT' THEN msg:='Assunto confidencial salvo: '||coalesce(NEW.subject->>'title','');
  ELSIF NEW.subject IS NOT DISTINCT FROM OLD.subject THEN RETURN NEW;
  ELSE msg:='Assunto confidencial alterado'||E'\nAntes: '||OLD.subject::text||E'\nDepois: '||NEW.subject::text; END IF;
 END IF;
 IF auth.uid() IS NOT NULL THEN
  INSERT INTO public.legal_subject_logs(record_id,subject_id,actor_id,actor_name,text) VALUES(rid,sid,auth.uid(),coalesce(actor,'Usuário'),msg||E'\npor '||coalesce(actor,'Usuário'));
 END IF;
 UPDATE public.legal_records SET content=jsonb_set(content,'{lastEditAt}',to_jsonb(clock_timestamp()))
  WHERE id=rid AND EXISTS(SELECT 1 FROM jsonb_array_elements(coalesce(content->'participants','[]'::jsonb)) x WHERE coalesce(x->>'signature','')<>'');
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER audit_legal_confidential_subject AFTER INSERT OR UPDATE OR DELETE ON public.legal_confidential_subjects FOR EACH ROW EXECUTE FUNCTION public.audit_legal_confidential_subject();