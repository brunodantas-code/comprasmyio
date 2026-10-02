CREATE OR REPLACE FUNCTION public.track_site_survey_visit_luc_history()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'UPDATE' AND current_setting('app.site_survey_luc_correction', true) = NEW.id::text THEN
    UPDATE public.site_survey_visit_luc_history
       SET luc_number = btrim(NEW.luc_number), shop_name = btrim(NEW.shop_name)
     WHERE visit_luc_id = NEW.id AND valid_until IS NULL;
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT'
     OR OLD.luc_number IS DISTINCT FROM NEW.luc_number
     OR OLD.shop_name IS DISTINCT FROM NEW.shop_name
     OR OLD.completion_status IS DISTINCT FROM NEW.completion_status
     OR OLD.cancellation_reason_id IS DISTINCT FROM NEW.cancellation_reason_id THEN
    UPDATE public.site_survey_visit_luc_history SET valid_until = now()
     WHERE visit_luc_id = NEW.id AND valid_until IS NULL;
    INSERT INTO public.site_survey_visit_luc_history (
      visit_luc_id, visit_id, luc_number, shop_name, changed_by,
      completion_status, cancellation_reason_id, cancelled_at
    ) VALUES (
      NEW.id, NEW.visit_id, btrim(NEW.luc_number), btrim(NEW.shop_name),
      COALESCE(NEW.updated_by, NEW.cancelled_by, NEW.created_by, auth.uid()),
      NEW.completion_status, NEW.cancellation_reason_id, NEW.cancelled_at
    );
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.correct_site_survey_visit_luc(
  _id uuid, _luc_number text, _shop_name text, _location text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _visit_id uuid;
  _previous_setting text;
BEGIN
  SELECT visit_id INTO _visit_id FROM public.site_survey_visit_lucs WHERE id = _id AND active = true FOR UPDATE;
  IF _visit_id IS NULL OR auth.uid() IS NULL
     OR NOT public.can_view_site_survey_visit(_visit_id, auth.uid())
     OR NOT (public.has_site_survey_permission(auth.uid(), 'site_survey_editar')
             OR public.has_site_survey_permission(auth.uid(), 'site_survey_executar')) THEN
    RAISE EXCEPTION 'Sem permissão para corrigir esta loja.' USING ERRCODE = '42501';
  END IF;
  IF nullif(btrim(_luc_number), '') IS NULL OR nullif(btrim(_shop_name), '') IS NULL THEN
    RAISE EXCEPTION 'Informe o LUC e o nome da loja.';
  END IF;
  _previous_setting := current_setting('app.site_survey_luc_correction', true);
  PERFORM set_config('app.site_survey_luc_correction', _id::text, true);
  UPDATE public.site_survey_visit_lucs
     SET luc_number = btrim(_luc_number), shop_name = btrim(_shop_name),
         location = nullif(btrim(_location), ''), updated_by = auth.uid()
   WHERE id = _id;
  PERFORM set_config('app.site_survey_luc_correction', coalesce(_previous_setting, ''), true);
END;
$function$;
REVOKE ALL ON FUNCTION public.correct_site_survey_visit_luc(uuid,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.correct_site_survey_visit_luc(uuid,text,text,text) TO authenticated;