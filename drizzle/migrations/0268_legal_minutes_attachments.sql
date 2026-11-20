CREATE FUNCTION public.legal_attachment_visible(_path text) RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path=public AS $$
 SELECT public.security_app_access(ARRAY['legal']) AND (
 EXISTS (SELECT 1 FROM public.legal_records r WHERE r.category='minutes' AND (
 EXISTS (SELECT 1 FROM jsonb_array_elements(coalesce(r.content->'attachments','[]'::jsonb)) a WHERE a->>'path'=_path)
 OR EXISTS (SELECT 1 FROM jsonb_array_elements(coalesce(r.content->'subjects','[]'::jsonb)) s CROSS JOIN LATERAL jsonb_array_elements(coalesce(s->'attachments','[]'::jsonb)) a WHERE a->>'path'=_path)))
 OR EXISTS (SELECT 1 FROM public.legal_confidential_subjects s CROSS JOIN LATERAL jsonb_array_elements(coalesce(s.subject->'attachments','[]'::jsonb)) a WHERE a->>'path'=_path));
$$;
REVOKE ALL ON FUNCTION public.legal_attachment_visible(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.legal_attachment_visible(text) TO authenticated, service_role;
CREATE POLICY legal_attachments_read ON storage.objects FOR SELECT TO authenticated USING (bucket_id='legal-attachments' AND public.legal_attachment_visible(name));
CREATE POLICY legal_attachments_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id='legal-attachments' AND public.security_app_access(ARRAY['legal']) AND (storage.foldername(name))[1]=auth.uid()::text AND owner_id=auth.uid()::text);
CREATE POLICY legal_attachments_delete ON storage.objects FOR DELETE TO authenticated USING (bucket_id='legal-attachments' AND public.security_app_access(ARRAY['legal']) AND ((storage.foldername(name))[1]=auth.uid()::text OR public.legal_attachment_visible(name)));