CREATE TABLE public.reminder_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  enabled boolean NOT NULL DEFAULT false,
  frequency text NOT NULL DEFAULT 'diaria' CHECK (frequency IN ('diaria','duas_vezes','semanal')),
  time_1 time NOT NULL DEFAULT '09:00',
  time_2 time NOT NULL DEFAULT '16:00',
  weekday integer NOT NULL DEFAULT 1 CHECK (weekday BETWEEN 0 AND 6),
  body_text text NOT NULL DEFAULT 'Você possui approvals pendentes de liberação. Acesse o sistema para analisá-los.',
  last_sent_at timestamptz,
  last_slot text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.reminder_settings TO authenticated;
GRANT ALL ON public.reminder_settings TO service_role;
ALTER TABLE public.reminder_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins podem ver lembretes" ON public.reminder_settings FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins podem criar lembretes" ON public.reminder_settings FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins podem editar lembretes" ON public.reminder_settings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER reminder_settings_updated_at BEFORE UPDATE ON public.reminder_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.reminder_settings (id) VALUES (true);

CREATE TABLE public.reminder_send_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient text NOT NULL,
  pending_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent','failed','skipped')),
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.reminder_send_log TO authenticated;
GRANT ALL ON public.reminder_send_log TO service_role;
ALTER TABLE public.reminder_send_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins veem envios de lembrete" ON public.reminder_send_log FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));