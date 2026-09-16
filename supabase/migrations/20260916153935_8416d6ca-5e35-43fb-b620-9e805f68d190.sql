CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  is_first boolean;
BEGIN
  SELECT NOT EXISTS (SELECT 1 FROM public.user_roles) INTO is_first;
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), NEW.email);
  INSERT INTO public.user_app_access (user_id, app_key)
  VALUES (NEW.id, 'development')
  ON CONFLICT (user_id, app_key) DO NOTHING;
  IF is_first THEN
    UPDATE public.user_access_profiles
       SET profile_definition_id = 'admin'
     WHERE user_id = NEW.id;
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  END IF;
  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

CREATE POLICY "Related users can read development ticket files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'development-ticket-attachments'
  AND EXISTS (
    SELECT 1 FROM public.development_tickets ticket
    WHERE ticket.id::text = (storage.foldername(name))[1]
      AND (ticket.reporter_id = auth.uid() OR ticket.assignee_id = auth.uid() OR private.is_erp_admin(auth.uid()))
  )
);
CREATE POLICY "Ticket authors can upload development ticket files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'development-ticket-attachments'
  AND EXISTS (
    SELECT 1 FROM public.development_tickets ticket
    WHERE ticket.id::text = (storage.foldername(name))[1]
      AND (ticket.reporter_id = auth.uid() OR private.is_erp_admin(auth.uid()))
  )
);
CREATE POLICY "Ticket authors can remove development ticket files"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'development-ticket-attachments'
  AND EXISTS (
    SELECT 1 FROM public.development_tickets ticket
    WHERE ticket.id::text = (storage.foldername(name))[1]
      AND (ticket.reporter_id = auth.uid() OR private.is_erp_admin(auth.uid()))
  )
);