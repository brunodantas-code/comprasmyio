CREATE TABLE public.site_survey_luc_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id uuid NOT NULL REFERENCES public.site_survey_visits(id) ON DELETE CASCADE,
  luc_number text NOT NULL,
  shop_name text NOT NULL,
  changed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  valid_from timestamptz NOT NULL DEFAULT now(),
  valid_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.site_survey_luc_history TO authenticated;
GRANT ALL ON public.site_survey_luc_history TO service_role;
ALTER TABLE public.site_survey_luc_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuários autorizados consultam histórico do LUC"
ON public.site_survey_luc_history FOR SELECT TO authenticated
USING (public.can_view_site_survey_visit(visit_id, auth.uid()));

CREATE INDEX site_survey_luc_history_visit_idx ON public.site_survey_luc_history (visit_id, valid_from DESC);
CREATE INDEX site_survey_luc_history_luc_idx ON public.site_survey_luc_history (luc_number, valid_from DESC);

CREATE OR REPLACE FUNCTION public.track_site_survey_luc_history()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.luc_number IS NULL OR btrim(NEW.luc_number) = '' OR NEW.shop_name IS NULL OR btrim(NEW.shop_name) = '' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT'
     OR OLD.luc_number IS DISTINCT FROM NEW.luc_number
     OR OLD.shop_name IS DISTINCT FROM NEW.shop_name THEN
    UPDATE public.site_survey_luc_history
       SET valid_until = now()
     WHERE visit_id = NEW.id
       AND valid_until IS NULL;

    INSERT INTO public.site_survey_luc_history (visit_id, luc_number, shop_name, changed_by)
    VALUES (NEW.id, btrim(NEW.luc_number), btrim(NEW.shop_name), auth.uid());
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER track_site_survey_luc_history
AFTER INSERT OR UPDATE OF luc_number, shop_name ON public.site_survey_visits
FOR EACH ROW EXECUTE FUNCTION public.track_site_survey_luc_history();