CREATE OR REPLACE FUNCTION public.pm_assumptions_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ DECLARE item jsonb; BEGIN
 IF EXISTS(SELECT 1 FROM public.pm_projects WHERE id=NEW.project_id AND status IN ('concluido','cancelado')) THEN RAISE EXCEPTION 'Projeto encerrado'; END IF;
 IF TG_OP='UPDATE' AND NEW.project_id<>OLD.project_id THEN RAISE EXCEPTION 'Não é permitido mover premissas entre projetos'; END IF;
 IF NEW.survey_id IS NOT NULL AND NOT public.can_view_site_survey_visit(NEW.survey_id,auth.uid()) THEN RAISE EXCEPTION 'Visita não autorizada'; END IF;
 FOR item IN SELECT value FROM jsonb_array_elements(NEW.entries) LOOP
 IF item->>'discipline' IS NULL OR item->>'discipline' NOT IN ('electrical','hydraulic') OR item->>'difficulty' IS NULL OR item->>'difficulty' NOT IN ('low','medium','high','unknown') OR item->>'quantity' IS NULL OR (item->>'quantity')::numeric<0 OR (item->>'quantity')::numeric<>trunc((item->>'quantity')::numeric) OR (item->>'productivity') IS NOT NULL AND (item->>'productivity')::numeric<=0 THEN RAISE EXCEPTION 'Premissa inválida: use quantidades inteiras e produtividade positiva'; END IF;
 END LOOP;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(NEW.entries) AS rows(value) GROUP BY rows.value->>'discipline',rows.value->>'difficulty' HAVING count(*)>1) THEN RAISE EXCEPTION 'Premissa duplicada'; END IF;
 RETURN NEW; END $$;