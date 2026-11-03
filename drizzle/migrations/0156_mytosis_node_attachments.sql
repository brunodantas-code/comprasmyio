CREATE TABLE public.mytosis_node_attachments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 node_id uuid NOT NULL REFERENCES public.mytosis_nodes(id) ON DELETE CASCADE,
 uploaded_by uuid NOT NULL DEFAULT auth.uid(),
 file_name text NOT NULL CHECK (length(file_name) BETWEEN 1 AND 255),
 storage_path text NOT NULL UNIQUE,
 content_type text NOT NULL,
 file_size bigint NOT NULL CHECK (file_size > 0),
 created_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT mytosis_attachment_path CHECK (split_part(storage_path,'/',1) = uploaded_by::text AND split_part(storage_path,'/',2) = node_id::text)
);
GRANT SELECT, INSERT, DELETE ON public.mytosis_node_attachments TO authenticated;
GRANT ALL ON public.mytosis_node_attachments TO service_role;
ALTER TABLE public.mytosis_node_attachments ENABLE ROW LEVEL SECURITY;
CREATE INDEX mytosis_node_attachments_node_idx ON public.mytosis_node_attachments(node_id);
CREATE POLICY mytosis_attachments_read ON public.mytosis_node_attachments FOR SELECT TO authenticated USING (public.mytosis_role(auth.uid()) IS NOT NULL AND EXISTS (SELECT 1 FROM public.mytosis_nodes n WHERE n.id=node_id));
CREATE POLICY mytosis_attachments_insert ON public.mytosis_node_attachments FOR INSERT TO authenticated WITH CHECK (uploaded_by=auth.uid() AND public.mytosis_can_edit(auth.uid()) AND EXISTS (SELECT 1 FROM public.mytosis_nodes n WHERE n.id=node_id) AND EXISTS (SELECT 1 FROM storage.objects o WHERE o.bucket_id='mytosis-attachments' AND o.name=storage_path AND o.owner_id=auth.uid()::text));
CREATE POLICY mytosis_attachments_delete ON public.mytosis_node_attachments FOR DELETE TO authenticated USING (public.mytosis_can_edit(auth.uid()));
CREATE POLICY mytosis_attachment_objects_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id='mytosis-attachments' AND (storage.foldername(name))[1]=auth.uid()::text AND public.mytosis_can_edit(auth.uid()) AND EXISTS (SELECT 1 FROM public.mytosis_nodes n WHERE n.id::text=(storage.foldername(name))[2]));
CREATE POLICY mytosis_attachment_objects_read ON storage.objects FOR SELECT TO authenticated USING (bucket_id='mytosis-attachments' AND public.mytosis_role(auth.uid()) IS NOT NULL AND EXISTS (SELECT 1 FROM public.mytosis_node_attachments a WHERE a.storage_path=name));
CREATE POLICY mytosis_attachment_objects_delete ON storage.objects FOR DELETE TO authenticated USING (bucket_id='mytosis-attachments' AND public.mytosis_can_edit(auth.uid()) AND EXISTS (SELECT 1 FROM public.mytosis_nodes n WHERE n.id::text=(storage.foldername(name))[2]));