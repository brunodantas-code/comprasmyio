CREATE TABLE public.user_reminders (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT true,
  frequency text NOT NULL DEFAULT 'diaria',
  time_1 time without time zone NOT NULL DEFAULT '09:00',
  time_2 time without time zone NOT NULL DEFAULT '16:00',
  weekday integer NOT NULL DEFAULT 1,
  body_text text NOT NULL DEFAULT 'Você possui approvals pendentes de liberação. Acesse o sistema para analisá-los.',
  last_sent_at timestamp with time zone,
  last_slot text,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_reminders TO authenticated;
GRANT ALL ON public.user_reminders TO service_role;

ALTER TABLE public.user_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados podem ver lembretes"
  ON public.user_reminders FOR SELECT TO authenticated USING (true);

CREATE POLICY "Gestores podem criar lembretes"
  ON public.user_reminders FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_limits(auth.uid()) OR user_id = auth.uid());

CREATE POLICY "Gestores podem editar lembretes"
  ON public.user_reminders FOR UPDATE TO authenticated
  USING (public.can_manage_limits(auth.uid()) OR user_id = auth.uid());

CREATE POLICY "Gestores podem excluir lembretes"
  ON public.user_reminders FOR DELETE TO authenticated
  USING (public.can_manage_limits(auth.uid()) OR user_id = auth.uid());

CREATE TRIGGER user_reminders_set_updated_at
  BEFORE UPDATE ON public.user_reminders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();