CREATE OR REPLACE FUNCTION public.opdesk_create_task(_values jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN RETURN public.opdesk_save_task(NULL,_values,NULL); END; $$;
REVOKE ALL ON FUNCTION public.opdesk_create_task(jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.opdesk_create_task(jsonb) TO authenticated;
CREATE OR REPLACE FUNCTION public.opdesk_guard_client() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.name:=trim(NEW.name); IF TG_OP='UPDATE' THEN NEW.created_by:=OLD.created_by; NEW.created_at:=OLD.created_at; END IF; RETURN NEW; END; $$;
CREATE TRIGGER opdesk_client_guard BEFORE INSERT OR UPDATE ON public.opdesk_clients FOR EACH ROW EXECUTE FUNCTION public.opdesk_guard_client();