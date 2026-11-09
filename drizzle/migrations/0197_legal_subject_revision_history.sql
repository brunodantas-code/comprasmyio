CREATE FUNCTION public.audit_legal_subject_revision() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE s jsonb; old_subject jsonb; actor text; event_text text;
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
 RETURN NEW;
END $$;
CREATE TRIGGER audit_legal_subject_revision AFTER INSERT OR UPDATE ON public.legal_records FOR EACH ROW EXECUTE FUNCTION public.audit_legal_subject_revision();