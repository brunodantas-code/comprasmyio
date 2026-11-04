CREATE TABLE public.mytosis_kpis (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 name text NOT NULL,
 description text,
 cost_center_id uuid NOT NULL REFERENCES public.cost_centers(id),
 responsible_id uuid NOT NULL,
 unit text NOT NULL DEFAULT '',
 target numeric NOT NULL,
 frequency text NOT NULL DEFAULT 'mensal' CHECK (frequency IN ('semanal','mensal','trimestral','semestral','anual')),
 active boolean NOT NULL DEFAULT true,
 created_by uuid NOT NULL DEFAULT auth.uid(),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.mytosis_kpi_results (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 kpi_id uuid NOT NULL REFERENCES public.mytosis_kpis(id) ON DELETE CASCADE,
 period_start date NOT NULL,
 value numeric NOT NULL,
 notes text,
 created_by uuid NOT NULL DEFAULT auth.uid(),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE (kpi_id, period_start)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mytosis_kpis TO authenticated;
GRANT ALL ON public.mytosis_kpis TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mytosis_kpi_results TO authenticated;
GRANT ALL ON public.mytosis_kpi_results TO service_role;
ALTER TABLE public.mytosis_kpis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mytosis_kpi_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY mytosis_kpis_read ON public.mytosis_kpis FOR SELECT TO authenticated USING (public.mytosis_role(auth.uid()) IS NOT NULL);
CREATE POLICY mytosis_kpis_create ON public.mytosis_kpis FOR INSERT TO authenticated WITH CHECK (public.mytosis_can_edit(auth.uid()) AND created_by = auth.uid());
CREATE POLICY mytosis_kpis_update ON public.mytosis_kpis FOR UPDATE TO authenticated USING (public.mytosis_can_edit(auth.uid())) WITH CHECK (public.mytosis_can_edit(auth.uid()));
CREATE POLICY mytosis_kpis_delete ON public.mytosis_kpis FOR DELETE TO authenticated USING (public.mytosis_can_edit(auth.uid()));
CREATE FUNCTION public.mytosis_can_post_kpi(_kpi_id uuid, _user_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT public.mytosis_role(_user_id) = 'admin' OR EXISTS (SELECT 1 FROM public.mytosis_kpis WHERE id = _kpi_id AND responsible_id = _user_id)
$$;
CREATE POLICY mytosis_kpi_results_read ON public.mytosis_kpi_results FOR SELECT TO authenticated USING (public.mytosis_role(auth.uid()) IS NOT NULL);
CREATE POLICY mytosis_kpi_results_create ON public.mytosis_kpi_results FOR INSERT TO authenticated WITH CHECK (public.mytosis_can_post_kpi(kpi_id, auth.uid()) AND created_by = auth.uid());
CREATE POLICY mytosis_kpi_results_update ON public.mytosis_kpi_results FOR UPDATE TO authenticated USING (public.mytosis_can_post_kpi(kpi_id, auth.uid())) WITH CHECK (public.mytosis_can_post_kpi(kpi_id, auth.uid()));
CREATE POLICY mytosis_kpi_results_delete ON public.mytosis_kpi_results FOR DELETE TO authenticated USING (public.mytosis_can_post_kpi(kpi_id, auth.uid()));
CREATE FUNCTION public.guard_mytosis_kpi() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
 IF length(trim(NEW.name)) = 0 THEN RAISE EXCEPTION 'Informe o nome do KPI.'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.mytosis_users() WHERE id = NEW.responsible_id) THEN RAISE EXCEPTION 'Responsável não disponível.'; END IF;
 IF TG_OP = 'UPDATE' THEN NEW.created_by := OLD.created_by; NEW.created_at := OLD.created_at; END IF;
 NEW.updated_at := now();
 RETURN NEW;
END $$;
CREATE TRIGGER guard_mytosis_kpi BEFORE INSERT OR UPDATE ON public.mytosis_kpis FOR EACH ROW EXECUTE FUNCTION public.guard_mytosis_kpi();
CREATE FUNCTION public.mytosis_segments() RETURNS TABLE(id uuid, name text, code text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT c.id, c.name, c.code FROM public.cost_centers c WHERE c.active AND public.mytosis_role(auth.uid()) IS NOT NULL ORDER BY c.code NULLS LAST, c.name
$$;
GRANT EXECUTE ON FUNCTION public.mytosis_segments() TO authenticated;
GRANT EXECUTE ON FUNCTION public.mytosis_can_post_kpi(uuid, uuid) TO authenticated;