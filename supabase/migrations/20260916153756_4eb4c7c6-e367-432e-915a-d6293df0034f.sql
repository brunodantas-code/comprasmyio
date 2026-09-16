CREATE TABLE public.development_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number bigint GENERATED ALWAYS AS IDENTITY UNIQUE,
  app_key text NOT NULL REFERENCES public.erp_apps(key),
  ticket_type text NOT NULL CHECK (ticket_type IN ('melhoria', 'bug')),
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 3 AND 120),
  description text NOT NULL CHECK (char_length(btrim(description)) BETWEEN 10 AND 4000),
  priority text NOT NULL CHECK (priority IN ('baixa', 'media', 'alta', 'critica')),
  urgency text NOT NULL CHECK (urgency IN ('normal', 'urgente')),
  expected_result text NOT NULL CHECK (char_length(btrim(expected_result)) BETWEEN 5 AND 2000),
  status text NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto', 'em_andamento', 'concluido', 'cancelado')),
  reporter_id uuid NOT NULL REFERENCES public.profiles(id),
  assignee_id uuid REFERENCES public.profiles(id),
  admin_notes text CHECK (admin_notes IS NULL OR char_length(admin_notes) <= 4000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.development_tickets TO authenticated;
GRANT ALL ON public.development_tickets TO service_role;
ALTER TABLE public.development_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Related users can view development tickets"
ON public.development_tickets FOR SELECT TO authenticated
USING (reporter_id = auth.uid() OR assignee_id = auth.uid() OR private.is_erp_admin(auth.uid()));
CREATE POLICY "Users can create own development tickets"
ON public.development_tickets FOR INSERT TO authenticated
WITH CHECK (
  reporter_id = auth.uid()
  AND status = 'aberto'
  AND assignee_id IS NULL
  AND admin_notes IS NULL
  AND private.has_app_access(auth.uid(), 'development')
);
CREATE POLICY "ERP admins can update development tickets"
ON public.development_tickets FOR UPDATE TO authenticated
USING (private.is_erp_admin(auth.uid()))
WITH CHECK (private.is_erp_admin(auth.uid()));
CREATE TRIGGER development_tickets_set_updated_at
BEFORE UPDATE ON public.development_tickets
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.development_ticket_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.development_tickets(id) ON DELETE CASCADE,
  changed_by uuid NOT NULL REFERENCES public.profiles(id),
  previous_status text,
  new_status text,
  previous_assignee_id uuid REFERENCES public.profiles(id),
  new_assignee_id uuid REFERENCES public.profiles(id),
  note text CHECK (note IS NULL OR char_length(note) <= 4000),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.development_ticket_logs TO authenticated;
GRANT ALL ON public.development_ticket_logs TO service_role;
ALTER TABLE public.development_ticket_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Related users can view development ticket logs"
ON public.development_ticket_logs FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.development_tickets ticket
  WHERE ticket.id = ticket_id
    AND (ticket.reporter_id = auth.uid() OR ticket.assignee_id = auth.uid() OR private.is_erp_admin(auth.uid()))
));

CREATE TABLE public.development_ticket_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.development_tickets(id) ON DELETE CASCADE,
  uploaded_by uuid NOT NULL REFERENCES public.profiles(id),
  file_name text NOT NULL CHECK (char_length(btrim(file_name)) BETWEEN 1 AND 255),
  storage_path text NOT NULL UNIQUE CHECK (char_length(btrim(storage_path)) BETWEEN 1 AND 500),
  content_type text NOT NULL CHECK (char_length(content_type) <= 120),
  file_size bigint NOT NULL CHECK (file_size > 0 AND file_size <= 10485760),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.development_ticket_attachments TO authenticated;
GRANT ALL ON public.development_ticket_attachments TO service_role;
ALTER TABLE public.development_ticket_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Related users can view development attachments"
ON public.development_ticket_attachments FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.development_tickets ticket
  WHERE ticket.id = ticket_id
    AND (ticket.reporter_id = auth.uid() OR ticket.assignee_id = auth.uid() OR private.is_erp_admin(auth.uid()))
));
CREATE POLICY "Ticket authors can add development attachments"
ON public.development_ticket_attachments FOR INSERT TO authenticated
WITH CHECK (
  uploaded_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.development_tickets ticket
    WHERE ticket.id = ticket_id
      AND (ticket.reporter_id = auth.uid() OR private.is_erp_admin(auth.uid()))
  )
);
CREATE POLICY "Uploaders and ERP admins can remove development attachments"
ON public.development_ticket_attachments FOR DELETE TO authenticated
USING (uploaded_by = auth.uid() OR private.is_erp_admin(auth.uid()));

CREATE INDEX development_tickets_reporter_idx ON public.development_tickets(reporter_id, created_at DESC);
CREATE INDEX development_tickets_assignee_idx ON public.development_tickets(assignee_id, created_at DESC);
CREATE INDEX development_tickets_status_idx ON public.development_tickets(status, created_at DESC);
CREATE INDEX development_ticket_logs_ticket_idx ON public.development_ticket_logs(ticket_id, created_at DESC);
CREATE INDEX development_ticket_attachments_ticket_idx ON public.development_ticket_attachments(ticket_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.log_development_ticket_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status
     OR OLD.assignee_id IS DISTINCT FROM NEW.assignee_id
     OR OLD.admin_notes IS DISTINCT FROM NEW.admin_notes THEN
    INSERT INTO public.development_ticket_logs (
      ticket_id, changed_by, previous_status, new_status,
      previous_assignee_id, new_assignee_id, note
    ) VALUES (
      NEW.id, auth.uid(), OLD.status, NEW.status,
      OLD.assignee_id, NEW.assignee_id,
      CASE WHEN OLD.admin_notes IS DISTINCT FROM NEW.admin_notes THEN NEW.admin_notes ELSE NULL END
    );
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.log_development_ticket_change() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_development_ticket_change() TO authenticated, service_role;
CREATE TRIGGER development_ticket_change_log
AFTER UPDATE ON public.development_tickets
FOR EACH ROW EXECUTE FUNCTION public.log_development_ticket_change();