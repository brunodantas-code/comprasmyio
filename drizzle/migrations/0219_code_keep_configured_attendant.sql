CREATE FUNCTION public.enforce_code_app_attendant() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE configured_id uuid;
BEGIN
 SELECT attendant_id INTO configured_id FROM public.code_app_attendants WHERE app_key=NEW.app_key;
 IF configured_id IS NOT NULL AND NEW.assignee_id IS DISTINCT FROM configured_id THEN
  RAISE EXCEPTION 'O responsável deste aplicativo deve ser alterado no menu Usuários do Code.';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER enforce_code_app_attendant BEFORE UPDATE OF assignee_id ON public.development_tickets FOR EACH ROW EXECUTE FUNCTION public.enforce_code_app_attendant();
REVOKE ALL ON FUNCTION public.enforce_code_app_attendant() FROM PUBLIC;