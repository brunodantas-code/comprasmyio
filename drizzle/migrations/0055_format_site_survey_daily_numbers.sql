CREATE OR REPLACE FUNCTION public.set_site_survey_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  d text;
  seq integer;
BEGIN
  IF NEW.survey_number IS NOT NULL THEN
    RETURN NEW;
  END IF;

  d := to_char((COALESCE(NEW.created_at, now()) AT TIME ZONE 'America/Sao_Paulo')::date, 'YYYYMMDD');

  PERFORM pg_advisory_xact_lock(hashtext('site_survey_number_' || d));

  SELECT COALESCE(MAX((survey_number % 10000)::integer), 0) + 1
    INTO seq
    FROM public.site_survey_visits
   WHERE survey_number::text LIKE d || '%';

  IF seq > 9999 THEN
    RAISE EXCEPTION 'Limite de 9999 visitas por dia atingido';
  END IF;

  NEW.survey_number := (d || lpad(seq::text, 4, '0'))::bigint;
  RETURN NEW;
END;
$$;

CREATE TRIGGER site_survey_visits_set_number
BEFORE INSERT ON public.site_survey_visits
FOR EACH ROW
EXECUTE FUNCTION public.set_site_survey_number();

COMMENT ON FUNCTION public.set_site_survey_number() IS 'Gera o número da visita no formato AAAAMMDDXXXX, com sequência diária no fuso de São Paulo.';