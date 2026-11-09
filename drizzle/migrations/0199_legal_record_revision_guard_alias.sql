CREATE OR REPLACE FUNCTION public.guard_legal_record() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE p jsonb; prior jsonb; verified boolean;
BEGIN
 IF length(trim(NEW.title))=0 THEN RAISE EXCEPTION 'Informe o título'; END IF;
 IF NEW.category='minutes' AND NEW.meeting_date IS NULL THEN RAISE EXCEPTION 'Informe a data da reunião'; END IF;
 verified := coalesce(auth.role()='service_role' AND current_setting('app.legal_verified_signing',true)='yes',false);
 IF TG_OP='UPDATE' THEN
  NEW.created_by:=OLD.created_by; NEW.created_at:=OLD.created_at;
  IF NOT verified AND (NEW.title IS DISTINCT FROM OLD.title OR NEW.meeting_date IS DISTINCT FROM OLD.meeting_date OR NEW.file_path IS DISTINCT FROM OLD.file_path OR public.legal_unsigned_content(NEW.content) IS DISTINCT FROM public.legal_unsigned_content(OLD.content)) THEN
   NEW.content:=jsonb_set(NEW.content,'{participants}',coalesce((SELECT jsonb_agg(part.value || jsonb_build_object('signature','','signedAt','','signedBy',null)) FROM jsonb_array_elements(coalesce(NEW.content->'participants','[]'::jsonb)) AS part(value)),'[]'::jsonb));
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