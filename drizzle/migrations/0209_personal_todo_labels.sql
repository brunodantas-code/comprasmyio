CREATE TABLE public.personal_todo_labels (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_id uuid NOT NULL DEFAULT auth.uid(), name text NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 80), color text NOT NULL DEFAULT 'var(--whatsapp-green)', icon text NOT NULL DEFAULT 'Tag', created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(owner_id, name), UNIQUE(id, owner_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.personal_todo_labels TO authenticated;
GRANT ALL ON public.personal_todo_labels TO service_role;
ALTER TABLE public.personal_todo_labels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own labels" ON public.personal_todo_labels FOR ALL TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE TABLE public.personal_todo_label_links (
 todo_id uuid NOT NULL REFERENCES public.personal_todos(id) ON DELETE CASCADE, label_id uuid NOT NULL, owner_id uuid NOT NULL DEFAULT auth.uid(), PRIMARY KEY(todo_id, label_id, owner_id), FOREIGN KEY(label_id, owner_id) REFERENCES public.personal_todo_labels(id, owner_id) ON DELETE CASCADE
);
GRANT SELECT, INSERT, DELETE ON public.personal_todo_label_links TO authenticated;
GRANT ALL ON public.personal_todo_label_links TO service_role;
ALTER TABLE public.personal_todo_label_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own task labels read" ON public.personal_todo_label_links FOR SELECT TO authenticated USING (owner_id = auth.uid() AND EXISTS (SELECT 1 FROM public.personal_todos t WHERE t.id = todo_id AND (t.owner_id = auth.uid() OR auth.uid() = ANY(t.shared_user_ids))));
CREATE POLICY "Own task labels insert" ON public.personal_todo_label_links FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid() AND EXISTS (SELECT 1 FROM public.personal_todos t WHERE t.id = todo_id AND (t.owner_id = auth.uid() OR auth.uid() = ANY(t.shared_user_ids))));
CREATE POLICY "Own task labels delete" ON public.personal_todo_label_links FOR DELETE TO authenticated USING (owner_id = auth.uid());