CREATE OR REPLACE FUNCTION public.log_site_survey_point_progress()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  point_kind text;
  point_label text;
BEGIN
  IF NEW.last_progress_at IS DISTINCT FROM OLD.last_progress_at THEN
    IF TG_TABLE_NAME = 'site_survey_visit_lucs' THEN
      point_kind := 'luc';
      point_label := concat('LUC ', NEW.luc_number, ' — ', NEW.shop_name);
    ELSE
      point_kind := 'ambiente';
      point_label := NEW.name;
    END IF;

    INSERT INTO public.site_survey_logs (visit_id, actor_id, action, details)
    VALUES (
      NEW.visit_id,
      auth.uid(),
      CASE WHEN NEW.completion_status = 'concluida' THEN 'loja_concluida' ELSE 'progresso_salvo_com_pendencias' END,
      jsonb_build_object(
        'etapa', '7 - Revisão, pendências, fotos e encerramento',
        'tipo_ponto', point_kind,
        'ponto_id', NEW.id,
        'ponto', point_label,
        'pendencias', NEW.pending_fields,
        'situacao', NEW.completion_status
      )
    );
  END IF;
  RETURN NEW;
END
$$;