ALTER TABLE public.site_survey_visit_lucs
  ADD COLUMN completion_status text NOT NULL DEFAULT 'pendente',
  ADD COLUMN completed_at timestamptz,
  ADD COLUMN completed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN pending_fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN last_progress_at timestamptz;

ALTER TABLE public.site_survey_visit_lucs
  ADD CONSTRAINT site_survey_visit_lucs_completion_status_check
  CHECK (completion_status IN ('pendente', 'concluida'));

ALTER TABLE public.site_survey_visit_environments
  ADD COLUMN completion_status text NOT NULL DEFAULT 'pendente',
  ADD COLUMN completed_at timestamptz,
  ADD COLUMN completed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN pending_fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN last_progress_at timestamptz;

ALTER TABLE public.site_survey_visit_environments
  ADD CONSTRAINT site_survey_visit_environments_completion_status_check
  CHECK (completion_status IN ('pendente', 'concluida'));

CREATE OR REPLACE FUNCTION public.log_site_survey_point_progress()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.last_progress_at IS DISTINCT FROM OLD.last_progress_at THEN
    INSERT INTO public.site_survey_logs (visit_id, actor_id, action, details)
    VALUES (
      NEW.visit_id,
      auth.uid(),
      CASE WHEN NEW.completion_status = 'concluida' THEN 'loja_concluida' ELSE 'progresso_salvo_com_pendencias' END,
      jsonb_build_object(
        'etapa', '7 - Revisão, pendências, fotos e encerramento',
        'tipo_ponto', CASE WHEN TG_TABLE_NAME = 'site_survey_visit_lucs' THEN 'luc' ELSE 'ambiente' END,
        'ponto_id', NEW.id,
        'ponto', CASE WHEN TG_TABLE_NAME = 'site_survey_visit_lucs' THEN concat('LUC ', NEW.luc_number, ' — ', NEW.shop_name) ELSE NEW.name END,
        'pendencias', NEW.pending_fields,
        'situacao', NEW.completion_status
      )
    );
  END IF;
  RETURN NEW;
END
$$;

CREATE TRIGGER site_survey_visit_lucs_progress_log
AFTER UPDATE OF completion_status, pending_fields, last_progress_at ON public.site_survey_visit_lucs
FOR EACH ROW EXECUTE FUNCTION public.log_site_survey_point_progress();

CREATE TRIGGER site_survey_visit_environments_progress_log
AFTER UPDATE OF completion_status, pending_fields, last_progress_at ON public.site_survey_visit_environments
FOR EACH ROW EXECUTE FUNCTION public.log_site_survey_point_progress();

CREATE INDEX site_survey_visit_lucs_completion_idx
ON public.site_survey_visit_lucs (visit_id, active, completion_status);

CREATE INDEX site_survey_visit_environments_completion_idx
ON public.site_survey_visit_environments (visit_id, active, completion_status);

COMMENT ON COLUMN public.site_survey_visit_lucs.pending_fields IS 'Pendências do último salvamento, registradas na etapa 7 do histórico da visita.';
COMMENT ON COLUMN public.site_survey_visit_environments.pending_fields IS 'Pendências do último salvamento, registradas na etapa 7 do histórico da visita.';