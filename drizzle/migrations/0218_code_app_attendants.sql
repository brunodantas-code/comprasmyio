CREATE TABLE public.code_app_attendants (
 app_key text PRIMARY KEY REFERENCES public.erp_apps(key),
 attendant_id uuid NOT NULL REFERENCES public.profiles(id),
 updated_by uuid NOT NULL DEFAULT auth.uid(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.code_app_attendants TO authenticated;
GRANT ALL ON public.code_app_attendants TO service_role;
ALTER TABLE public.code_app_attendants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Code users read app attendants" ON public.code_app_attendants FOR SELECT TO authenticated USING (private.has_app_access(auth.uid(),'development'));
CREATE POLICY "Code admins manage app attendants" ON public.code_app_attendants FOR ALL TO authenticated USING (private.is_code_admin(auth.uid())) WITH CHECK (private.is_code_admin(auth.uid()));
CREATE FUNCTION public.guard_code_app_attendant() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
BEGIN
 IF NOT private.is_code_admin(auth.uid()) THEN RAISE EXCEPTION 'Somente Admins com acesso ao Code podem vincular atendentes.'; END IF;
 IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
 IF TG_OP = 'UPDATE' AND NEW.app_key IS DISTINCT FROM OLD.app_key THEN RAISE EXCEPTION 'O aplicativo do vínculo não pode ser alterado.'; END IF;
 IF NOT private.is_code_admin(NEW.attendant_id) THEN RAISE EXCEPTION 'Selecione um Admin com acesso ativo ao Code.'; END IF;
 NEW.updated_by := auth.uid(); NEW.updated_at := now(); RETURN NEW;
END $$;
CREATE TRIGGER code_app_attendant_guard BEFORE INSERT OR UPDATE OR DELETE ON public.code_app_attendants FOR EACH ROW EXECUTE FUNCTION public.guard_code_app_attendant();
CREATE FUNCTION public.apply_code_app_attendant() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
BEGIN
 UPDATE public.development_tickets SET assignee_id = CASE WHEN TG_OP='DELETE' THEN NULL ELSE NEW.attendant_id END
 WHERE app_key = CASE WHEN TG_OP='DELETE' THEN OLD.app_key ELSE NEW.app_key END AND status NOT IN ('concluido','excluido')
 AND assignee_id IS DISTINCT FROM CASE WHEN TG_OP='DELETE' THEN NULL ELSE NEW.attendant_id END;
 RETURN NULL;
END $$;
CREATE TRIGGER code_app_attendant_apply AFTER INSERT OR UPDATE OR DELETE ON public.code_app_attendants FOR EACH ROW EXECUTE FUNCTION public.apply_code_app_attendant();
CREATE FUNCTION public.assign_new_code_ticket() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
BEGIN
 SELECT a.attendant_id INTO NEW.assignee_id FROM public.code_app_attendants a WHERE a.app_key=NEW.app_key AND private.is_code_admin(a.attendant_id);
 RETURN NEW;
END $$;
CREATE TRIGGER assign_new_code_ticket BEFORE INSERT ON public.development_tickets FOR EACH ROW EXECUTE FUNCTION public.assign_new_code_ticket();
ALTER POLICY "Users can create own development tickets" ON public.development_tickets WITH CHECK (
 reporter_id=auth.uid() AND status='aberto' AND admin_notes IS NULL AND private.has_app_access(auth.uid(),'development')
 AND (assignee_id IS NULL OR EXISTS(SELECT 1 FROM public.code_app_attendants a WHERE a.app_key=development_tickets.app_key AND a.attendant_id=development_tickets.assignee_id AND private.is_code_admin(a.attendant_id)))
);
REVOKE ALL ON FUNCTION public.guard_code_app_attendant(), public.apply_code_app_attendant(), public.assign_new_code_ticket() FROM PUBLIC;
