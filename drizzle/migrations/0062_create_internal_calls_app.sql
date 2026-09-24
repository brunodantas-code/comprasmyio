CREATE TABLE public.internal_calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  call_number text UNIQUE,
  category text NOT NULL CHECK (category IN ('problema_campo', 'reclamacao_cliente', 'outros')),
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 3 AND 120),
  description text NOT NULL CHECK (char_length(btrim(description)) BETWEEN 5 AND 4000),
  priority text NOT NULL DEFAULT 'media' CHECK (priority IN ('baixa', 'media', 'alta', 'critica')),
  status text NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto', 'em_atendimento', 'aguardando', 'resolvido', 'cancelado')),
  reporter_id uuid NOT NULL REFERENCES public.profiles(id),
  assignee_id uuid REFERENCES public.profiles(id),
  internal_notes text CHECK (internal_notes IS NULL OR char_length(internal_notes) <= 4000),
  source text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'site_survey')),
  site_survey_visit_id uuid REFERENCES public.site_survey_visits(id) ON DELETE SET NULL,
  site_survey_question_id uuid REFERENCES public.site_survey_questions(id) ON DELETE SET NULL,
  site_survey_visit_luc_id uuid REFERENCES public.site_survey_visit_lucs(id) ON DELETE SET NULL,
  site_survey_visit_environment_id uuid REFERENCES public.site_survey_visit_environments(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT internal_calls_point_scope_check CHECK (site_survey_visit_luc_id IS NULL OR site_survey_visit_environment_id IS NULL)
);
GRANT SELECT, INSERT, UPDATE ON public.internal_calls TO authenticated;
GRANT ALL ON public.internal_calls TO service_role;
ALTER TABLE public.internal_calls ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.internal_call_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id uuid NOT NULL REFERENCES public.internal_calls(id) ON DELETE CASCADE,
  changed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  previous_status text,
  new_status text,
  previous_assignee_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  new_assignee_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.internal_call_logs TO authenticated;
GRANT ALL ON public.internal_call_logs TO service_role;
ALTER TABLE public.internal_call_logs ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.internal_call_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id uuid NOT NULL REFERENCES public.internal_calls(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.profiles(id),
  message text NOT NULL CHECK (char_length(btrim(message)) BETWEEN 1 AND 4000),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.internal_call_messages TO authenticated;
GRANT ALL ON public.internal_call_messages TO service_role;
ALTER TABLE public.internal_call_messages ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.internal_call_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id uuid NOT NULL REFERENCES public.internal_calls(id) ON DELETE CASCADE,
  uploaded_by uuid NOT NULL REFERENCES public.profiles(id),
  file_name text NOT NULL CHECK (char_length(btrim(file_name)) BETWEEN 1 AND 255),
  storage_path text NOT NULL UNIQUE,
  content_type text NOT NULL,
  file_size bigint NOT NULL CHECK (file_size > 0 AND file_size <= 10485760),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.internal_call_attachments TO authenticated;
GRANT ALL ON public.internal_call_attachments TO service_role;
ALTER TABLE public.internal_call_attachments ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.set_internal_call_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  d text;
  seq integer;
BEGIN
  IF NEW.call_number IS NOT NULL THEN RETURN NEW; END IF;
  d := to_char((COALESCE(NEW.created_at, now()) AT TIME ZONE 'America/Sao_Paulo')::date, 'YYYYMMDD');
  PERFORM pg_advisory_xact_lock(hashtext('internal_call_number_' || d));
  SELECT COALESCE(MAX(substring(call_number from 9 for 4)::int), 0) + 1 INTO seq
  FROM public.internal_calls WHERE call_number LIKE d || '%';
  IF seq > 9999 THEN RAISE EXCEPTION 'Limite de 9999 chamados por dia atingido'; END IF;
  NEW.call_number := d || lpad(seq::text, 4, '0');
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.set_internal_call_number() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_internal_call_number() TO authenticated, service_role;
CREATE TRIGGER internal_calls_set_number BEFORE INSERT ON public.internal_calls FOR EACH ROW EXECUTE FUNCTION public.set_internal_call_number();
CREATE TRIGGER internal_calls_set_updated_at BEFORE UPDATE ON public.internal_calls FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.log_internal_call_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status OR OLD.assignee_id IS DISTINCT FROM NEW.assignee_id OR OLD.internal_notes IS DISTINCT FROM NEW.internal_notes THEN
    INSERT INTO public.internal_call_logs(call_id, changed_by, previous_status, new_status, previous_assignee_id, new_assignee_id, note)
    VALUES (NEW.id, auth.uid(), OLD.status, NEW.status, OLD.assignee_id, NEW.assignee_id, CASE WHEN OLD.internal_notes IS DISTINCT FROM NEW.internal_notes THEN NEW.internal_notes ELSE NULL END);
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.log_internal_call_change() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.log_internal_call_change() TO authenticated, service_role;
CREATE TRIGGER internal_call_change_log AFTER UPDATE ON public.internal_calls FOR EACH ROW EXECUTE FUNCTION public.log_internal_call_change();

CREATE POLICY "Users can view related internal calls" ON public.internal_calls FOR SELECT TO authenticated
USING (reporter_id = auth.uid() OR assignee_id = auth.uid() OR public.is_erp_admin(auth.uid()));
CREATE POLICY "Users can create own internal calls" ON public.internal_calls FOR INSERT TO authenticated
WITH CHECK (reporter_id = auth.uid() AND status = 'aberto' AND assignee_id IS NULL);
CREATE POLICY "Related users can update internal calls" ON public.internal_calls FOR UPDATE TO authenticated
USING (reporter_id = auth.uid() OR assignee_id = auth.uid() OR public.is_erp_admin(auth.uid()))
WITH CHECK (reporter_id = auth.uid() OR assignee_id = auth.uid() OR public.is_erp_admin(auth.uid()));

CREATE POLICY "Related users can view internal call logs" ON public.internal_call_logs FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.internal_calls c WHERE c.id = call_id AND (c.reporter_id = auth.uid() OR c.assignee_id = auth.uid() OR public.is_erp_admin(auth.uid()))));
CREATE POLICY "Related users can view internal call messages" ON public.internal_call_messages FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.internal_calls c WHERE c.id = call_id AND (c.reporter_id = auth.uid() OR c.assignee_id = auth.uid() OR public.is_erp_admin(auth.uid()))));
CREATE POLICY "Related users can write internal call messages" ON public.internal_call_messages FOR INSERT TO authenticated
WITH CHECK (author_id = auth.uid() AND EXISTS (SELECT 1 FROM public.internal_calls c WHERE c.id = call_id AND (c.reporter_id = auth.uid() OR c.assignee_id = auth.uid() OR public.is_erp_admin(auth.uid()))));
CREATE POLICY "Related users can view internal call attachments" ON public.internal_call_attachments FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.internal_calls c WHERE c.id = call_id AND (c.reporter_id = auth.uid() OR c.assignee_id = auth.uid() OR public.is_erp_admin(auth.uid()))));
CREATE POLICY "Related users can add internal call attachments" ON public.internal_call_attachments FOR INSERT TO authenticated
WITH CHECK (uploaded_by = auth.uid() AND EXISTS (SELECT 1 FROM public.internal_calls c WHERE c.id = call_id AND (c.reporter_id = auth.uid() OR c.assignee_id = auth.uid() OR public.is_erp_admin(auth.uid()))));
CREATE POLICY "Uploaders can remove internal call attachments" ON public.internal_call_attachments FOR DELETE TO authenticated
USING (uploaded_by = auth.uid() OR public.is_erp_admin(auth.uid()));

CREATE INDEX internal_calls_reporter_idx ON public.internal_calls(reporter_id, created_at DESC);
CREATE INDEX internal_calls_assignee_idx ON public.internal_calls(assignee_id, created_at DESC);
CREATE INDEX internal_calls_status_idx ON public.internal_calls(status, created_at DESC);
CREATE INDEX internal_call_logs_call_idx ON public.internal_call_logs(call_id, created_at DESC);
CREATE INDEX internal_call_messages_call_idx ON public.internal_call_messages(call_id, created_at);
CREATE INDEX internal_call_attachments_call_idx ON public.internal_call_attachments(call_id, created_at);

ALTER TABLE public.site_survey_generated_calls ADD COLUMN internal_call_id uuid REFERENCES public.internal_calls(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX site_survey_generated_calls_internal_call_key ON public.site_survey_generated_calls(internal_call_id) WHERE internal_call_id IS NOT NULL;
COMMENT ON TABLE public.site_survey_generated_calls IS 'Vínculo entre respostas do Site Survey e chamados internos gerados automaticamente.';