CREATE POLICY "Related users can read internal call files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'internal-call-attachments'
  AND EXISTS (
    SELECT 1 FROM public.internal_call_attachments attachment
    JOIN public.internal_calls call ON call.id = attachment.call_id
    WHERE attachment.storage_path = name
      AND (call.reporter_id = auth.uid() OR call.assignee_id = auth.uid() OR public.is_erp_admin(auth.uid()))
  )
);

CREATE POLICY "Users can upload internal call files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'internal-call-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can remove own internal call files"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'internal-call-attachments' AND owner_id = auth.uid()::text);