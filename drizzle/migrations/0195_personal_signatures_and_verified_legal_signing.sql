CREATE TABLE public.user_signatures (
 user_id uuid PRIMARY KEY,
 image text NOT NULL CHECK (length(image) BETWEEN 30 AND 180000 AND image LIKE 'data:image/png;base64,%'),
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_signatures TO authenticated;
GRANT ALL ON public.user_signatures TO service_role;
ALTER TABLE public.user_signatures ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_signatures_owner ON public.user_signatures FOR ALL TO authenticated USING (user_id=auth.uid()) WITH CHECK (user_id=auth.uid());
CREATE TABLE public.legal_signature_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 record_id uuid NOT NULL REFERENCES public.legal_records(id) ON DELETE CASCADE,
 user_id uuid NOT NULL,
 participant_id text,
 signer_name text NOT NULL,
 image text NOT NULL,
 signed_at timestamptz NOT NULL DEFAULT now(),
 record_updated_at timestamptz NOT NULL,
 content_hash text NOT NULL
);
GRANT SELECT ON public.legal_signature_events TO authenticated;
GRANT ALL ON public.legal_signature_events TO service_role;
ALTER TABLE public.legal_signature_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY legal_signature_events_read ON public.legal_signature_events FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.legal_records r WHERE r.id=record_id));
CREATE FUNCTION public.legal_unsigned_content(_content jsonb) RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path=public AS $$
 SELECT jsonb_set(coalesce(_content,'{}'::jsonb),'{participants}',coalesce((SELECT jsonb_agg(p - 'signature' - 'signedAt' - 'signedBy') FROM jsonb_array_elements(coalesce(_content->'participants','[]'::jsonb)) p),'[]'::jsonb));
$$;
CREATE OR REPLACE FUNCTION public.guard_legal_record() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE p jsonb; prior jsonb; verified boolean;
BEGIN
 IF length(trim(NEW.title))=0 THEN RAISE EXCEPTION 'Informe o título'; END IF;
 IF NEW.category='minutes' AND NEW.meeting_date IS NULL THEN RAISE EXCEPTION 'Informe a data da reunião'; END IF;
 verified := coalesce(auth.role()='service_role' AND current_setting('app.legal_verified_signing',true)='yes',false);
 IF TG_OP='UPDATE' THEN
  NEW.created_by:=OLD.created_by; NEW.created_at:=OLD.created_at;
  IF NOT verified AND (NEW.title IS DISTINCT FROM OLD.title OR NEW.meeting_date IS DISTINCT FROM OLD.meeting_date OR NEW.file_path IS DISTINCT FROM OLD.file_path OR public.legal_unsigned_content(NEW.content) IS DISTINCT FROM public.legal_unsigned_content(OLD.content)) THEN
   NEW.content:=jsonb_set(NEW.content,'{participants}',coalesce((SELECT jsonb_agg(p || jsonb_build_object('signature','','signedAt','','signedBy',null)) FROM jsonb_array_elements(coalesce(NEW.content->'participants','[]'::jsonb)) p),'[]'::jsonb));
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
CREATE FUNCTION public.apply_verified_legal_signature(_record_id uuid,_user_id uuid,_participant_id text,_expected_updated_at timestamptz) RETURNS timestamptz LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.legal_records; image_value text; name_value text; participant jsonb; sign_time timestamptz:=clock_timestamp();
BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'Acesso negado'; END IF;
 SELECT * INTO r FROM public.legal_records WHERE id=_record_id FOR UPDATE;
 IF r.id IS NULL OR r.updated_at IS DISTINCT FROM _expected_updated_at THEN RAISE EXCEPTION 'O documento mudou. Reabra antes de assinar'; END IF;
 SELECT image INTO image_value FROM public.user_signatures WHERE user_id=_user_id;
 SELECT full_name INTO name_value FROM public.profiles WHERE id=_user_id AND is_active=true;
 IF image_value IS NULL OR name_value IS NULL THEN RAISE EXCEPTION 'Cadastre sua assinatura e verifique seu acesso'; END IF;
 IF r.category='minutes' THEN
  SELECT value INTO participant FROM jsonb_array_elements(coalesce(r.content->'participants','[]'::jsonb)) WHERE value->>'id'=_participant_id;
  IF participant IS NULL OR NOT (participant->>'userId'=_user_id::text OR (coalesce(participant->>'userId','')='' AND lower(trim(participant->>'name'))=lower(trim(name_value)) AND (SELECT count(*) FROM public.profiles WHERE lower(trim(full_name))=lower(trim(name_value)))=1)) THEN RAISE EXCEPTION 'Você só pode assinar como seu próprio usuário'; END IF;
  IF coalesce(participant->>'signature','')<>'' THEN RAISE EXCEPTION 'Assinatura já registrada'; END IF;
  PERFORM set_config('app.legal_verified_signing','yes',true);
  UPDATE public.legal_records SET content=jsonb_set(content,'{participants}',(SELECT jsonb_agg(CASE WHEN p->>'id'=_participant_id THEN p || jsonb_build_object('signature',image_value,'signedAt',sign_time,'signedBy',_user_id,'userId',_user_id) ELSE p END) FROM jsonb_array_elements(content->'participants') p)),pdf_path=NULL WHERE id=_record_id;
 END IF;
 INSERT INTO public.legal_signature_events(record_id,user_id,participant_id,signer_name,image,signed_at,record_updated_at,content_hash) VALUES (_record_id,_user_id,_participant_id,name_value,image_value,sign_time,r.updated_at,md5(jsonb_build_object('title',r.title,'date',r.meeting_date,'content',public.legal_unsigned_content(r.content),'file',r.file_path)::text));
 RETURN sign_time;
END $$;
REVOKE ALL ON FUNCTION public.apply_verified_legal_signature(uuid,uuid,text,timestamptz) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.apply_verified_legal_signature(uuid,uuid,text,timestamptz) TO service_role;