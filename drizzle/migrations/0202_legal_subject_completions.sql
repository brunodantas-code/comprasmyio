CREATE TABLE public.legal_subject_completions (
 record_id uuid NOT NULL REFERENCES public.legal_records(id) ON DELETE CASCADE,
 subject_id text NOT NULL,
 completed_at timestamptz NOT NULL DEFAULT now(),
 completed_by uuid NOT NULL DEFAULT auth.uid(),
 PRIMARY KEY (record_id, subject_id)
);
GRANT SELECT, INSERT, DELETE ON public.legal_subject_completions TO authenticated;
GRANT ALL ON public.legal_subject_completions TO service_role;
ALTER TABLE public.legal_subject_completions ENABLE ROW LEVEL SECURITY;
CREATE POLICY legal_subject_completions_read ON public.legal_subject_completions FOR SELECT TO authenticated USING (EXISTS(SELECT 1 FROM public.legal_records r WHERE r.id=record_id));
CREATE POLICY legal_subject_completions_insert ON public.legal_subject_completions FOR INSERT TO authenticated WITH CHECK (completed_by=auth.uid() AND EXISTS(SELECT 1 FROM public.legal_records r WHERE r.id=record_id AND r.category='minutes'));
CREATE POLICY legal_subject_completions_delete ON public.legal_subject_completions FOR DELETE TO authenticated USING (EXISTS(SELECT 1 FROM public.legal_records r WHERE r.id=record_id));
CREATE FUNCTION public.audit_legal_subject_completion() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE actor text; rec record;
BEGIN
 SELECT full_name INTO actor FROM public.profiles WHERE id=auth.uid();
 IF TG_OP='INSERT' THEN rec:=NEW; ELSE rec:=OLD; END IF;
 INSERT INTO public.legal_subject_logs(record_id,subject_id,actor_id,actor_name,text) VALUES(rec.record_id,rec.subject_id,auth.uid(),coalesce(actor,'Usuário'),CASE WHEN TG_OP='INSERT' THEN 'Deliberação concluída' ELSE 'Deliberação reaberta' END||E'\npor '||coalesce(actor,'Usuário'));
 RETURN rec;
END $$;
CREATE TRIGGER audit_legal_subject_completion AFTER INSERT OR DELETE ON public.legal_subject_completions FOR EACH ROW EXECUTE FUNCTION public.audit_legal_subject_completion();