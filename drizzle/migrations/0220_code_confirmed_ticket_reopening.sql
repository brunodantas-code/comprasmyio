CREATE OR REPLACE FUNCTION private.validate_development_ticket_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'private'
AS $function$
DECLARE
  actor_id uuid := auth.uid();
  actor_is_code_admin boolean;
  actor_is_reporter boolean;
BEGIN
  IF actor_id IS NULL THEN RETURN NEW; END IF;
  actor_is_code_admin := private.is_code_admin(actor_id);
  actor_is_reporter := OLD.reporter_id = actor_id;
  IF OLD.status = 'concluido' AND NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status <> 'em_atendimento'
       OR NOT private.has_app_access(actor_id, 'development')
       OR NOT (actor_is_reporter OR (actor_is_code_admin AND OLD.assignee_id = actor_id))
       OR current_setting('app.code_reopen_ticket', true) IS DISTINCT FROM OLD.id::text
       OR length(btrim(coalesce(current_setting('app.code_reopen_reason', true), ''))) NOT BETWEEN 1 AND 2000
       OR (to_jsonb(NEW) - 'status' - 'updated_at') IS DISTINCT FROM (to_jsonb(OLD) - 'status' - 'updated_at') THEN
      RAISE EXCEPTION 'Somente o Solicitante ou Atendente atribuído pode reabrir pelo botão Reabrir chamado, informando o motivo.' USING ERRCODE='42501';
    END IF;
    RETURN NEW;
  END IF;
  IF current_setting('app.code_auto_status', true) = 'on'
     AND NEW.status IN ('aguardando_resposta','em_atendimento')
     AND (to_jsonb(NEW) - 'status' - 'updated_at') = (to_jsonb(OLD) - 'status' - 'updated_at') THEN
    RETURN NEW;
  END IF;
  IF current_setting('app.code_title_edit', true) = 'on'
     AND OLD.reporter_id = actor_id
     AND (to_jsonb(NEW) - 'title' - 'updated_at') = (to_jsonb(OLD) - 'title' - 'updated_at') THEN
    RETURN NEW;
  END IF;
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
    IF NEW.status IN ('concluido','excluido') AND NEW.status IS DISTINCT FROM OLD.status THEN
      RAISE EXCEPTION 'Somente o solicitante pode concluir ou excluir seu ticket nas condições permitidas.';
    END IF;
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'Somente Admins com acesso ao Code podem gerenciar o atendimento; o solicitante pode concluir um ticket atendido, reabrir um concluído ou excluir seu ticket em aberto.';
END;
$function$;
REVOKE ALL ON FUNCTION private.validate_development_ticket_update() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.reopen_code_ticket(_ticket_id uuid, _reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'private'
AS $function$
DECLARE
  actor_id uuid := auth.uid();
  t public.development_tickets%ROWTYPE;
  clean_reason text := btrim(coalesce(_reason, ''));
  prior_ticket text := current_setting('app.code_reopen_ticket', true);
  prior_reason text := current_setting('app.code_reopen_reason', true);
BEGIN
  IF actor_id IS NULL OR NOT private.has_app_access(actor_id, 'development') THEN
    RAISE EXCEPTION 'Sem acesso ativo ao Code.' USING ERRCODE='42501';
  END IF;
  SELECT * INTO t FROM public.development_tickets WHERE id=_ticket_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Chamado indisponível.' USING ERRCODE='42501'; END IF;
  IF NOT (t.reporter_id = actor_id OR (coalesce(t.assignee_id = actor_id, false) AND private.is_code_admin(actor_id))) THEN
    RAISE EXCEPTION 'Somente o Solicitante ou Atendente atribuído pode reabrir o chamado.' USING ERRCODE='42501';
  END IF;
  IF t.status <> 'concluido' THEN RAISE EXCEPTION 'Somente chamados concluídos podem ser reabertos.'; END IF;
  IF length(clean_reason) NOT BETWEEN 1 AND 2000 THEN RAISE EXCEPTION 'Informe o motivo da reabertura, com no máximo 2000 caracteres.'; END IF;
  PERFORM set_config('app.code_reopen_ticket', t.id::text, true);
  PERFORM set_config('app.code_reopen_reason', clean_reason, true);
  UPDATE public.development_tickets SET status='em_atendimento' WHERE id=t.id;
  PERFORM set_config('app.code_reopen_ticket', coalesce(prior_ticket, ''), true);
  PERFORM set_config('app.code_reopen_reason', coalesce(prior_reason, ''), true);
END;
$function$;
REVOKE ALL ON FUNCTION public.reopen_code_ticket(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reopen_code_ticket(uuid,text) TO authenticated;

CREATE OR REPLACE FUNCTION private.log_development_ticket_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE reopened boolean := OLD.status='concluido' AND NEW.status='em_atendimento';
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status
     OR OLD.assignee_id IS DISTINCT FROM NEW.assignee_id
     OR OLD.admin_notes IS DISTINCT FROM NEW.admin_notes THEN
    INSERT INTO public.development_ticket_logs (
      ticket_id, changed_by, previous_status, new_status,
      previous_assignee_id, new_assignee_id, note, event_type
    ) VALUES (
      NEW.id, auth.uid(), OLD.status, NEW.status,
      OLD.assignee_id, NEW.assignee_id,
      CASE WHEN reopened THEN btrim(current_setting('app.code_reopen_reason', true))
           WHEN OLD.admin_notes IS DISTINCT FROM NEW.admin_notes THEN NEW.admin_notes ELSE NULL END,
      CASE WHEN reopened THEN 'ticket_reopened' ELSE NULL END
    );
  END IF;
  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION private.log_development_ticket_change() FROM PUBLIC, anon, authenticated;
NOTIFY pgrst, 'reload schema';