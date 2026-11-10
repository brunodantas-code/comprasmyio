CREATE TABLE public.personal_todo_preferences (
 user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
 ordered_ids uuid[] NOT NULL DEFAULT '{}',
 sort_mode text NOT NULL DEFAULT 'manual' CHECK (sort_mode IN ('manual','due','priority','title','newest','oldest','status'))
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.personal_todo_preferences TO authenticated;
GRANT ALL ON public.personal_todo_preferences TO service_role;
ALTER TABLE public.personal_todo_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_todo_preferences ON public.personal_todo_preferences FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());