CREATE OR REPLACE FUNCTION public.guard_legal_record() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE p jsonb; prior jsonb; verified boolean; had_signed boolean;
BEGIN
 IF length(trim(NEW.title))=0 THEN RAISE EXCEPTION 'Informe o título'; END IF;
 IF NEW.category='minutes' AND NEW.meeting_date IS NULL THEN RAISE EXCEPTION 'Informe a data da reunião'; END IF;
 verified := coalesce(auth.role()='service_role' AND current_setting('app.legal_verified_signing',true)='yes',false);
 IF TG_OP='UPDATE' THEN
  NEW.created_by:=OLD.created_by; NEW.created_at:=OLD.created_at;
  IF NOT verified THEN
   NEW.content:=jsonb_set(NEW.content,'{revision}',coalesce(OLD.content->'revision','0'::jsonb));
  END IF;
  IF NOT verified AND (NEW.title IS DISTINCT FROM OLD.title OR NEW.meeting_date IS DISTINCT FROM OLD.meeting_date OR NEW.file_path IS DISTINCT FROM OLD.file_path OR public.legal_unsigned_content(NEW.content) - 'revision' IS DISTINCT FROM public.legal_unsigned_content(OLD.content) - 'revision') THEN
   had_signed := EXISTS(SELECT 1 FROM jsonb_array_elements(coalesce(OLD.content->'participants','[]'::jsonb)) x WHERE coalesce(x->>'signature','')<>'');
   NEW.content:=jsonb_set(NEW.content,'{participants}',coalesce((SELECT jsonb_agg(part.value || jsonb_build_object('signature','','signedAt','','signedBy',null)) FROM jsonb_array_elements(coalesce(NEW.content->'participants','[]'::jsonb)) AS part(value)),'[]'::jsonb));
   IF had_signed THEN NEW.content:=jsonb_set(NEW.content,'{revision}',to_jsonb(coalesce((OLD.content->>'revision')::int,0)+1)); END IF;
   NEW.pdf_path:=NULL;
  END IF;
 END IF;
 IF NOT verified THEN
  FOR p IN SELECT value FROM jsonb_array_elements(coalesce(NEW.content->'participants','[]'::jsonb)) LOOP
   IF coalesce(p->>'signature','')<>'' OR coalesce(p->>'signedAt','')<>'' THEN
    prior:=NULL;
    IF TG_OP='UPDATE' THEN SELECT value INTO prior FROM jsonb_array_elements(coalesce(OLD.content->'participants','[]'::jsonb)) WHERE value->>'id'=p->>'id'; END IF;
    IF prior IS NULL OR (p->'signature',p->'signedAt',p->'signedBy') IS DISTINCT FROM (prior->'signature',prior->'signedAt',prior->'signedBy') THEN RAISE EXCEPTION 'Confirme sua senha para assinar'; END IF;
   END IF;
  END LOOP;
 END IF;
 IF NEW.pdf_path IS NOT NULL AND split_part(NEW.pdf_path,'/',2)<>NEW.id::text THEN RAISE EXCEPTION 'Documento inválido'; END IF;
 IF NEW.file_path IS NOT NULL AND split_part(NEW.file_path,'/',2)<>NEW.id::text THEN RAISE EXCEPTION 'Documento inválido'; END IF;
 NEW.updated_at:=now(); RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.audit_legal_subject_revision() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE s jsonb; old_subject jsonb; actor text; event_text text; old_signed boolean; new_signed boolean;
BEGIN
 IF auth.uid() IS NULL OR NEW.category<>'minutes' THEN RETURN NEW; END IF;
 SELECT full_name INTO actor FROM public.profiles WHERE id=auth.uid();
 FOR s IN SELECT value FROM jsonb_array_elements(coalesce(NEW.content->'subjects','[]'::jsonb)) LOOP
  old_subject:=NULL;
  IF TG_OP='UPDATE' THEN SELECT value INTO old_subject FROM jsonb_array_elements(coalesce(OLD.content->'subjects','[]'::jsonb)) WHERE value->>'id'=s->>'id'; END IF;
  IF old_subject IS NULL THEN event_text:='Assunto adicionado: '||coalesce(s->>'title','');
  ELSIF old_subject IS DISTINCT FROM s THEN event_text:='Assunto alterado'||E'\nAntes: '||old_subject::text||E'\nDepois: '||s::text;
  ELSE CONTINUE; END IF;
  INSERT INTO public.legal_subject_logs(record_id,subject_id,actor_id,actor_name,text) VALUES(NEW.id,s->>'id',auth.uid(),coalesce(actor,'Usuário'),event_text||E'\npor '||coalesce(actor,'Usuário'));
 END LOOP;
 IF TG_OP='UPDATE' AND coalesce((NEW.content->>'revision')::int,0) > coalesce((OLD.content->>'revision')::int,0) THEN
  FOR s IN SELECT value FROM jsonb_array_elements(coalesce(NEW.content->'subjects','[]'::jsonb)) LOOP
   INSERT INTO public.legal_subject_logs(record_id,subject_id,actor_id,actor_name,text) VALUES(NEW.id,s->>'id',auth.uid(),coalesce(actor,'Usuário'),'Ata editada após assinatura (edição '||(NEW.content->>'revision')||'): novas assinaturas solicitadas aos participantes'||E'\npor '||coalesce(actor,'Usuário'));
  END LOOP;
 END IF;
 RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.legal_request_resignature() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE rid uuid;
BEGIN
 IF TG_TABLE_NAME='legal_actions' THEN
  IF TG_OP='UPDATE' AND (to_jsonb(NEW) - 'completed_at' - 'completed_by' - 'updated_at') = (to_jsonb(OLD) - 'completed_at' - 'completed_by' - 'updated_at') THEN RETURN NEW; END IF;
  rid:=NEW.record_id;
 ELSE
  IF TG_OP='UPDATE' AND NEW.message IS NOT DISTINCT FROM OLD.message AND NEW.deleted_at IS NOT DISTINCT FROM OLD.deleted_at THEN RETURN NEW; END IF;
  SELECT record_id INTO rid FROM public.legal_actions WHERE id=NEW.action_id;
 END IF;
 UPDATE public.legal_records SET content=jsonb_set(content,'{lastEditAt}',to_jsonb(clock_timestamp()))
  WHERE id=rid AND category='minutes' AND EXISTS(SELECT 1 FROM jsonb_array_elements(coalesce(content->'participants','[]'::jsonb)) x WHERE coalesce(x->>'signature','')<>'');
 RETURN NEW;
END $$;
CREATE TRIGGER legal_actions_request_resignature AFTER INSERT OR UPDATE ON public.legal_actions FOR EACH ROW EXECUTE FUNCTION public.legal_request_resignature();
CREATE TRIGGER legal_observations_request_resignature AFTER INSERT OR UPDATE ON public.legal_action_observations FOR EACH ROW EXECUTE FUNCTION public.legal_request_resignature();