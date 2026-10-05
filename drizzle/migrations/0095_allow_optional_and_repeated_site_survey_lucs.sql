ALTER TABLE public.site_survey_visit_lucs
  DROP CONSTRAINT IF EXISTS site_survey_visit_lucs_luc_not_blank;

ALTER TABLE public.site_survey_visit_lucs
  DROP CONSTRAINT IF EXISTS site_survey_visit_lucs_visit_id_luc_number_key;

COMMENT ON COLUMN public.site_survey_visit_lucs.luc_number IS 'Identificação LUC opcional; string vazia representa loja sem LUC oficial e valores podem se repetir na mesma OS.';

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
  IF nullif(btrim(_shop_name), '') IS NULL THEN
    RAISE EXCEPTION 'Informe o nome da loja.';
  END IF;
  _previous_setting := current_setting('app.site_survey_luc_correction', true);
  PERFORM set_config('app.site_survey_luc_correction', _id::text, true);
  UPDATE public.site_survey_visit_lucs
     SET luc_number = btrim(coalesce(_luc_number, '')), shop_name = btrim(_shop_name),
         location = nullif(btrim(_location), ''), updated_by = auth.uid()
   WHERE id = _id;
  PERFORM set_config('app.site_survey_luc_correction', coalesce(_previous_setting, ''), true);
END;
$function$;

REVOKE ALL ON FUNCTION public.correct_site_survey_visit_luc(uuid,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.correct_site_survey_visit_luc(uuid,text,text,text) TO authenticated;