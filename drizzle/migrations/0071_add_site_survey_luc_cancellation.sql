CREATE TABLE public.site_survey_cancellation_reasons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  position integer NOT NULL DEFAULT 0,
  created_by uuid NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT site_survey_cancellation_reasons_name_not_blank CHECK (btrim(name) <> ''),
  CONSTRAINT site_survey_cancellation_reasons_name_unique UNIQUE (name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_survey_cancellation_reasons TO authenticated;
GRANT ALL ON public.site_survey_cancellation_reasons TO service_role;
ALTER TABLE public.site_survey_cancellation_reasons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Site Survey cancellation reasons are readable by app users"
ON public.site_survey_cancellation_reasons FOR SELECT TO authenticated
USING (
  public.has_site_survey_permission(auth.uid(), 'site_survey_visitas_minhas')
  OR public.has_site_survey_permission(auth.uid(), 'site_survey_visitas_todas')
  OR public.has_site_survey_permission(auth.uid(), 'site_survey_configuracoes')
  OR public.has_site_survey_permission(auth.uid(), 'site_survey_cadastro')
);
CREATE POLICY "Site Survey cancellation reasons are managed by configurators"
ON public.site_survey_cancellation_reasons FOR ALL TO authenticated
USING (
  public.has_site_survey_permission(auth.uid(), 'site_survey_configuracoes')
  OR public.has_site_survey_permission(auth.uid(), 'site_survey_cadastro')
)
WITH CHECK (
  public.has_site_survey_permission(auth.uid(), 'site_survey_configuracoes')
  OR public.has_site_survey_permission(auth.uid(), 'site_survey_cadastro')
);

ALTER TABLE public.site_survey_visit_lucs
  ADD COLUMN cancellation_reason_id uuid NULL REFERENCES public.site_survey_cancellation_reasons(id) ON DELETE RESTRICT,
  ADD COLUMN cancelled_at timestamptz NULL,
  ADD COLUMN cancelled_by uuid NULL REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.site_survey_visit_lucs DROP CONSTRAINT site_survey_visit_lucs_completion_status_check;
ALTER TABLE public.site_survey_visit_lucs ADD CONSTRAINT site_survey_visit_lucs_completion_status_check CHECK (completion_status = ANY (ARRAY['pendente'::text, 'concluida'::text, 'cancelada'::text]));
ALTER TABLE public.site_survey_visit_lucs ADD CONSTRAINT site_survey_visit_lucs_cancellation_data_check CHECK (
  (completion_status = 'cancelada' AND cancellation_reason_id IS NOT NULL AND cancelled_at IS NOT NULL)
  OR completion_status <> 'cancelada'
);

ALTER TABLE public.site_survey_visit_luc_history
  ADD COLUMN completion_status text NOT NULL DEFAULT 'pendente',
  ADD COLUMN cancellation_reason_id uuid NULL REFERENCES public.site_survey_cancellation_reasons(id) ON DELETE RESTRICT,
  ADD COLUMN cancelled_at timestamptz NULL;
ALTER TABLE public.site_survey_visit_luc_history ADD CONSTRAINT site_survey_visit_luc_history_completion_status_check CHECK (completion_status = ANY (ARRAY['pendente'::text, 'concluida'::text, 'cancelada'::text]));

CREATE OR REPLACE FUNCTION public.track_site_survey_visit_luc_history()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT'
     OR OLD.luc_number IS DISTINCT FROM NEW.luc_number
     OR OLD.shop_name IS DISTINCT FROM NEW.shop_name
     OR OLD.completion_status IS DISTINCT FROM NEW.completion_status
     OR OLD.cancellation_reason_id IS DISTINCT FROM NEW.cancellation_reason_id THEN
    UPDATE public.site_survey_visit_luc_history
       SET valid_until = now()
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