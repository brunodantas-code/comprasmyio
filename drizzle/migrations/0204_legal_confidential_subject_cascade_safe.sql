CREATE OR REPLACE FUNCTION public.audit_legal_confidential_subject() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE actor text; rid uuid; sid text; msg text;
BEGIN
 IF TG_OP='DELETE' AND NOT EXISTS(SELECT 1 FROM public.legal_records WHERE id=OLD.record_id) THEN RETURN OLD; END IF;
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