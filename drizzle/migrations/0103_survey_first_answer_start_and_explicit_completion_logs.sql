CREATE OR REPLACE FUNCTION public.start_survey_point_on_first_answer()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_value jsonb;
BEGIN
  IF NEW.visit_luc_id IS NULL AND NEW.visit_environment_id IS NULL THEN RETURN NEW; END IF;
  IF EXISTS (SELECT 1 FROM public.site_survey_visits WHERE id=NEW.visit_id AND is_manual_entry) THEN RETURN NEW; END IF;
  v_value := CASE WHEN jsonb_typeof(NEW.answer)='object' THEN NEW.answer->'value' ELSE NEW.answer END;
  IF v_value IS NULL OR v_value IN ('null'::jsonb, '""'::jsonb, '[]'::jsonb, '{}'::jsonb) THEN
    IF COALESCE(NEW.answer->>'detail','')='' AND COALESCE(NEW.answer->>'photo_reference_id','')='' THEN RETURN NEW; END IF;
  END IF;
  IF NEW.visit_luc_id IS NOT NULL THEN
    UPDATE public.site_survey_visit_lucs SET started_at=clock_timestamp(), started_by=NEW.answered_by WHERE id=NEW.visit_luc_id AND started_at IS NULL AND completion_status='pendente';
  ELSE
    UPDATE public.site_survey_visit_environments SET started_at=clock_timestamp(), started_by=NEW.answered_by WHERE id=NEW.visit_environment_id AND started_at IS NULL AND completion_status='pendente';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER survey_first_answer_starts_point AFTER INSERT OR UPDATE OF answer ON public.site_survey_responses FOR EACH ROW EXECUTE FUNCTION public.start_survey_point_on_first_answer();
CREATE OR REPLACE FUNCTION public.log_site_survey_point_progress()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE point_kind text; point_label text; is_completion boolean;
BEGIN
  IF TG_TABLE_NAME='site_survey_visit_lucs' THEN
    point_kind:='luc'; point_label:=concat('LUC ',NEW.luc_number,' — ',NEW.shop_name);
  ELSE point_kind:='ambiente'; point_label:=NEW.name; END IF;
  IF OLD.started_at IS NULL AND NEW.started_at IS NOT NULL THEN
    INSERT INTO public.site_survey_logs(visit_id,actor_id,action,details) VALUES(NEW.visit_id,COALESCE(auth.uid(),NEW.started_by),'ponto_iniciado',jsonb_build_object('ponto_id',NEW.id,'tipo_ponto',point_kind,'ponto',point_label,'inicio',NEW.started_at));
  END IF;
  is_completion := NEW.completion_status='concluida' AND (OLD.completion_status IS DISTINCT FROM 'concluida' OR NEW.completed_at IS DISTINCT FROM OLD.completed_at);
  IF is_completion OR NEW.last_progress_at IS DISTINCT FROM OLD.last_progress_at THEN
    INSERT INTO public.site_survey_logs(visit_id,actor_id,action,details) VALUES(NEW.visit_id,auth.uid(),CASE WHEN is_completion THEN 'loja_concluida' ELSE 'progresso_salvo_com_pendencias' END,jsonb_build_object('etapa','7 - Revisão, pendências, fotos e encerramento','tipo_ponto',point_kind,'ponto_id',NEW.id,'ponto',point_label,'pendencias',NEW.pending_fields,'situacao',NEW.completion_status));
  END IF;
  RETURN NEW;
END $$;