ALTER TABLE public.development_tickets DROP CONSTRAINT IF EXISTS development_tickets_status_check;
DO $$ DECLARE c text; BEGIN
  FOR c IN SELECT conname FROM pg_constraint WHERE conrelid='public.development_tickets'::regclass AND contype='c' AND pg_get_constraintdef(oid) LIKE '%em_atendimento%' LOOP
    EXECUTE format('ALTER TABLE public.development_tickets DROP CONSTRAINT %I', c);
  END LOOP; END $$;
ALTER TABLE public.development_tickets ADD CONSTRAINT development_tickets_status_check
  CHECK (status IN ('aberto','em_atendimento','aguardando_resposta','atendido','concluido','excluido'));

CREATE OR REPLACE FUNCTION private.sync_development_ticket_reply_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','private' AS $$
DECLARE t record;
BEGIN
  SELECT id, reporter_id, status INTO t FROM public.development_tickets WHERE id = NEW.ticket_id;
  IF t.status IN ('concluido','excluido') THEN RETURN NEW; END IF;
  PERFORM set_config('app.code_auto_status','on',true);
  IF NEW.message_type = 'question' AND NEW.author_id <> t.reporter_id THEN
    UPDATE public.development_tickets SET status='aguardando_resposta' WHERE id=t.id AND status <> 'aguardando_resposta';
  ELSIF NEW.message_type = 'answer' AND NEW.author_id = t.reporter_id AND t.status='aguardando_resposta'
    AND NOT EXISTS (SELECT 1 FROM public.development_ticket_messages q WHERE q.ticket_id=t.id AND q.message_type='question' AND q.author_id<>t.reporter_id
      AND NOT EXISTS (SELECT 1 FROM public.development_ticket_messages a WHERE a.parent_message_id=q.id)) THEN
    UPDATE public.development_tickets SET status='em_atendimento' WHERE id=t.id;
  END IF;
  PERFORM set_config('app.code_auto_status','off',true);
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS development_ticket_message_reply_status ON public.development_ticket_messages;
CREATE TRIGGER development_ticket_message_reply_status AFTER INSERT ON public.development_ticket_messages
FOR EACH ROW EXECUTE FUNCTION private.sync_development_ticket_reply_status();

CREATE OR REPLACE FUNCTION private.validate_development_ticket_update()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','private' AS $function$
DECLARE
  actor_id uuid := auth.uid();
  actor_is_code_admin boolean;
  actor_is_reporter boolean;
BEGIN
  IF actor_id IS NULL THEN RETURN NEW; END IF;
  IF current_setting('app.code_auto_status', true) = 'on'
     AND NEW.status IN ('aguardando_resposta','em_atendimento')
     AND (to_jsonb(NEW) - 'status' - 'updated_at') = (to_jsonb(OLD) - 'status' - 'updated_at') THEN
    RETURN NEW;
  END IF;
  actor_is_code_admin := private.is_code_admin(actor_id);
  actor_is_reporter := OLD.reporter_id = actor_id;
  IF NEW.id IS DISTINCT FROM OLD.id OR NEW.ticket_number IS DISTINCT FROM OLD.ticket_number OR NEW.reporter_id IS DISTINCT FROM OLD.reporter_id
     OR NEW.app_key IS DISTINCT FROM OLD.app_key OR NEW.ticket_type IS DISTINCT FROM OLD.ticket_type OR NEW.title IS DISTINCT FROM OLD.title
     OR NEW.description IS DISTINCT FROM OLD.description OR NEW.priority IS DISTINCT FROM OLD.priority OR NEW.urgency IS DISTINCT FROM OLD.urgency
     OR NEW.expected_result IS DISTINCT FROM OLD.expected_result OR NEW.menu_name IS DISTINCT FROM OLD.menu_name
     OR NEW.submenu_name IS DISTINCT FROM OLD.submenu_name OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Os dados originais do ticket não podem ser alterados.';
  END IF;
  IF NEW.assignee_id IS NOT NULL AND NOT private.is_code_admin(NEW.assignee_id) THEN
    RAISE EXCEPTION 'O responsável deve ser um Admin com acesso ativo ao Code.';
  END IF;
  IF NEW.status = 'excluido' AND OLD.status IS DISTINCT FROM 'excluido' THEN
    IF NOT actor_is_reporter OR OLD.status <> 'aberto' THEN
      RAISE EXCEPTION 'Somente o solicitante pode excluir seu próprio ticket enquanto estiver em aberto.';
    END IF;
    IF NEW.assignee_id IS DISTINCT FROM OLD.assignee_id OR NEW.admin_notes IS DISTINCT FROM OLD.admin_notes THEN
      RAISE EXCEPTION 'A exclusão não pode alterar a gestão do ticket.';
    END IF;
    RETURN NEW;
  END IF;
  IF OLD.status = 'excluido' AND NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'Tickets excluídos não podem ser reabertos.';
  END IF;
  IF NEW.status = 'concluido' AND OLD.status IS DISTINCT FROM 'concluido' THEN
    IF NOT actor_is_reporter OR OLD.status <> 'atendido' THEN
      RAISE EXCEPTION 'Somente o solicitante pode concluir um ticket atendido.';
    END IF;
    IF NEW.assignee_id IS DISTINCT FROM OLD.assignee_id OR NEW.admin_notes IS DISTINCT FROM OLD.admin_notes THEN
      RAISE EXCEPTION 'A conclusão pelo solicitante não pode alterar a gestão do ticket.';
    END IF;
    RETURN NEW;
  END IF;
  IF actor_is_code_admin THEN
    IF OLD.status = 'concluido' AND NEW.status IS DISTINCT FROM OLD.status THEN
      RAISE EXCEPTION 'Tickets concluídos não podem ser reabertos.';
    END IF;
    IF NEW.status IN ('concluido','excluido') AND NEW.status IS DISTINCT FROM OLD.status THEN
      RAISE EXCEPTION 'Somente o solicitante pode concluir ou excluir seu ticket nas condições permitidas.';
    END IF;
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'Somente Admins com acesso ao Code podem gerenciar o atendimento; o solicitante pode concluir um ticket atendido ou excluir seu ticket em aberto.';
END;
$function$;