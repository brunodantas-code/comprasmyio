CREATE OR REPLACE FUNCTION private.validate_development_ticket_update()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'private'
AS $function$
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
  IF current_setting('app.code_title_edit', true) = 'on'
     AND OLD.reporter_id = actor_id
     AND (to_jsonb(NEW) - 'title' - 'updated_at') = (to_jsonb(OLD) - 'title' - 'updated_at') THEN
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

CREATE OR REPLACE FUNCTION public.edit_code_ticket_title(_ticket_id uuid, _title text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE t public.development_tickets%ROWTYPE; clean text := btrim(coalesce(_title,''));
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Não autenticado.' USING ERRCODE='42501'; END IF;
 IF length(clean) < 3 OR length(clean) > 120 THEN RAISE EXCEPTION 'O título deve ter entre 3 e 120 caracteres.'; END IF;
 SELECT * INTO t FROM public.development_tickets WHERE id=_ticket_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Chamado não encontrado.'; END IF;
 IF t.reporter_id <> auth.uid() THEN RAISE EXCEPTION 'Somente o Solicitante pode alterar o título.' USING ERRCODE='42501'; END IF;
 IF t.status IN ('concluido','excluido') THEN RAISE EXCEPTION 'Chamado encerrado não permite edição.'; END IF;
 IF clean = t.title THEN RETURN; END IF;
 PERFORM set_config('app.code_title_edit','on',true);
 UPDATE public.development_tickets SET title=clean WHERE id=_ticket_id;
 PERFORM set_config('app.code_title_edit','off',true);
 INSERT INTO public.development_ticket_logs(ticket_id,changed_by,previous_status,new_status,event_type,note,previous_note)
 VALUES(_ticket_id,auth.uid(),t.status,t.status,'title_edited',clean,t.title);
END;
$function$;
REVOKE ALL ON FUNCTION public.edit_code_ticket_title(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.edit_code_ticket_title(uuid,text) TO authenticated;
NOTIFY pgrst, 'reload schema';