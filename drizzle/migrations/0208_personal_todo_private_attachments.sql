CREATE TABLE public.personal_todo_attachments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), todo_id uuid NOT NULL REFERENCES public.personal_todos(id),
 message_id uuid REFERENCES public.personal_todo_messages(id), uploaded_by uuid NOT NULL DEFAULT auth.uid(),
 file_name text NOT NULL, storage_path text NOT NULL UNIQUE, created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.personal_todo_attachments TO authenticated;
GRANT ALL ON public.personal_todo_attachments TO service_role;
ALTER TABLE public.personal_todo_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY todo_attachment_read ON public.personal_todo_attachments FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.personal_todos t WHERE t.id=todo_id));
CREATE POLICY todo_attachment_insert ON public.personal_todo_attachments FOR INSERT TO authenticated WITH CHECK(uploaded_by=auth.uid() AND storage_path LIKE todo_id::text||'/'||auth.uid()::text||'/%' AND EXISTS(SELECT 1 FROM public.personal_todos t WHERE t.id=todo_id AND t.status NOT IN ('concluido','excluido')) AND (message_id IS NULL OR EXISTS(SELECT 1 FROM public.personal_todo_messages m WHERE m.id=message_id AND m.todo_id=personal_todo_attachments.todo_id AND m.author_id=auth.uid())));
CREATE POLICY todo_attachment_delete ON public.personal_todo_attachments FOR DELETE TO authenticated USING(uploaded_by=auth.uid() AND EXISTS(SELECT 1 FROM public.personal_todos t WHERE t.id=todo_id AND t.status NOT IN ('concluido','excluido')));
CREATE POLICY todo_file_read ON storage.objects FOR SELECT TO authenticated USING(bucket_id='personal-todo-attachments' AND EXISTS(SELECT 1 FROM public.personal_todos t WHERE t.id::text=split_part(name,'/',1)));
CREATE POLICY todo_file_upload ON storage.objects FOR INSERT TO authenticated WITH CHECK(bucket_id='personal-todo-attachments' AND split_part(name,'/',2)=auth.uid()::text AND EXISTS(SELECT 1 FROM public.personal_todos t WHERE t.id::text=split_part(name,'/',1) AND t.status NOT IN ('concluido','excluido')));
CREATE POLICY todo_file_delete ON storage.objects FOR DELETE TO authenticated USING(bucket_id='personal-todo-attachments' AND split_part(name,'/',2)=auth.uid()::text AND EXISTS(SELECT 1 FROM public.personal_todos t WHERE t.id::text=split_part(name,'/',1) AND t.status NOT IN ('concluido','excluido')));