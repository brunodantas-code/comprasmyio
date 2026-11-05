CREATE TABLE public.legal_records (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 category text NOT NULL CHECK (category IN ('minutes','contracts','templates')),
 title text NOT NULL,
 meeting_date date,
 content jsonb NOT NULL DEFAULT '{}'::jsonb,
 pdf_path text,
 file_path text,
 file_name text,
 created_by uuid NOT NULL DEFAULT auth.uid(),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.legal_records TO authenticated;
GRANT ALL ON public.legal_records TO service_role;
ALTER TABLE public.legal_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY legal_records_read ON public.legal_records FOR SELECT TO authenticated USING (public.security_app_access(ARRAY['legal']));
CREATE POLICY legal_records_insert ON public.legal_records FOR INSERT TO authenticated WITH CHECK (created_by=auth.uid() AND public.security_app_access(ARRAY['legal']));
CREATE POLICY legal_records_update ON public.legal_records FOR UPDATE TO authenticated USING (public.security_app_access(ARRAY['legal'])) WITH CHECK (public.security_app_access(ARRAY['legal']));
CREATE POLICY legal_records_delete ON public.legal_records FOR DELETE TO authenticated USING (public.security_app_access(ARRAY['legal']));
CREATE FUNCTION public.guard_legal_record() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF length(trim(NEW.title))=0 THEN RAISE EXCEPTION 'Informe o título'; END IF;
 IF NEW.category='minutes' AND NEW.meeting_date IS NULL THEN RAISE EXCEPTION 'Informe a data da reunião'; END IF;
 IF TG_OP='UPDATE' THEN NEW.created_by:=OLD.created_by; NEW.created_at:=OLD.created_at; END IF;
 IF NEW.pdf_path IS NOT NULL AND split_part(NEW.pdf_path,'/',2)<>NEW.id::text THEN RAISE EXCEPTION 'Documento inválido'; END IF;
 IF NEW.file_path IS NOT NULL AND split_part(NEW.file_path,'/',2)<>NEW.id::text THEN RAISE EXCEPTION 'Documento inválido'; END IF;
 NEW.updated_at:=now(); RETURN NEW;
END $$;
CREATE TRIGGER guard_legal_record BEFORE INSERT OR UPDATE ON public.legal_records FOR EACH ROW EXECUTE FUNCTION public.guard_legal_record();
CREATE INDEX legal_records_category_date ON public.legal_records(category,meeting_date DESC);
CREATE POLICY legal_files_read ON storage.objects FOR SELECT TO authenticated USING (bucket_id='legal-documents' AND public.security_app_access(ARRAY['legal']) AND EXISTS (SELECT 1 FROM public.legal_records r WHERE r.id::text=(storage.foldername(name))[2]));
CREATE POLICY legal_files_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id='legal-documents' AND public.security_app_access(ARRAY['legal']) AND (storage.foldername(name))[1]=auth.uid()::text AND owner_id=auth.uid()::text);
CREATE POLICY legal_files_delete ON storage.objects FOR DELETE TO authenticated USING (bucket_id='legal-documents' AND public.security_app_access(ARRAY['legal']) AND ((storage.foldername(name))[1]=auth.uid()::text OR EXISTS (SELECT 1 FROM public.legal_records r WHERE r.id::text=(storage.foldername(name))[2])));