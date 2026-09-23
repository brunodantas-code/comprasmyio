CREATE TABLE public.site_survey_visit_lucs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id uuid NOT NULL REFERENCES public.site_survey_visits(id) ON DELETE CASCADE,
  luc_number text NOT NULL,
  shop_name text NOT NULL,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT site_survey_visit_lucs_luc_not_blank CHECK (btrim(luc_number) <> ''),
  CONSTRAINT site_survey_visit_lucs_shop_not_blank CHECK (btrim(shop_name) <> ''),
  UNIQUE (visit_id, luc_number)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_survey_visit_lucs TO authenticated;
GRANT ALL ON public.site_survey_visit_lucs TO service_role;
ALTER TABLE public.site_survey_visit_lucs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view accessible visit LUCs" ON public.site_survey_visit_lucs FOR SELECT TO authenticated USING (public.can_view_site_survey_visit(visit_id, auth.uid()));
CREATE POLICY "Schedulers can add visit LUCs" ON public.site_survey_visit_lucs FOR INSERT TO authenticated WITH CHECK (public.can_view_site_survey_visit(visit_id, auth.uid()) AND (public.has_site_survey_permission(auth.uid(), 'site_survey_agendar') OR public.has_site_survey_permission(auth.uid(), 'site_survey_editar')) AND created_by = auth.uid());
CREATE POLICY "Editors can update visit LUCs" ON public.site_survey_visit_lucs FOR UPDATE TO authenticated USING (public.can_view_site_survey_visit(visit_id, auth.uid()) AND (public.has_site_survey_permission(auth.uid(), 'site_survey_editar') OR public.has_site_survey_permission(auth.uid(), 'site_survey_executar'))) WITH CHECK (public.can_view_site_survey_visit(visit_id, auth.uid()) AND (public.has_site_survey_permission(auth.uid(), 'site_survey_editar') OR public.has_site_survey_permission(auth.uid(), 'site_survey_executar')));
CREATE POLICY "Editors can delete visit LUCs" ON public.site_survey_visit_lucs FOR DELETE TO authenticated USING (public.can_view_site_survey_visit(visit_id, auth.uid()) AND public.has_site_survey_permission(auth.uid(), 'site_survey_editar'));
CREATE INDEX site_survey_visit_lucs_visit_idx ON public.site_survey_visit_lucs (visit_id, luc_number);
CREATE TRIGGER site_survey_visit_lucs_updated_at BEFORE UPDATE ON public.site_survey_visit_lucs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.site_survey_visit_luc_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_luc_id uuid NOT NULL REFERENCES public.site_survey_visit_lucs(id) ON DELETE CASCADE,
  visit_id uuid NOT NULL REFERENCES public.site_survey_visits(id) ON DELETE CASCADE,
  luc_number text NOT NULL,
  shop_name text NOT NULL,
  changed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  valid_from timestamptz NOT NULL DEFAULT now(),
  valid_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.site_survey_visit_luc_history TO authenticated;
GRANT ALL ON public.site_survey_visit_luc_history TO service_role;
ALTER TABLE public.site_survey_visit_luc_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view accessible visit LUC history" ON public.site_survey_visit_luc_history FOR SELECT TO authenticated USING (public.can_view_site_survey_visit(visit_id, auth.uid()));
CREATE INDEX site_survey_visit_luc_history_visit_idx ON public.site_survey_visit_luc_history (visit_id, valid_from DESC);
CREATE INDEX site_survey_visit_luc_history_luc_idx ON public.site_survey_visit_luc_history (visit_luc_id, valid_from DESC);

CREATE OR REPLACE FUNCTION public.track_site_survey_visit_luc_history()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR OLD.luc_number IS DISTINCT FROM NEW.luc_number OR OLD.shop_name IS DISTINCT FROM NEW.shop_name THEN
    UPDATE public.site_survey_visit_luc_history
       SET valid_until = now()
     WHERE visit_luc_id = NEW.id AND valid_until IS NULL;
    INSERT INTO public.site_survey_visit_luc_history (visit_luc_id, visit_id, luc_number, shop_name, changed_by)
    VALUES (NEW.id, NEW.visit_id, btrim(NEW.luc_number), btrim(NEW.shop_name), COALESCE(NEW.updated_by, NEW.created_by, auth.uid()));
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER track_site_survey_visit_luc_history
AFTER INSERT OR UPDATE OF luc_number, shop_name ON public.site_survey_visit_lucs
FOR EACH ROW EXECUTE FUNCTION public.track_site_survey_visit_luc_history();

INSERT INTO public.site_survey_visit_lucs (visit_id, luc_number, shop_name, created_by, updated_by)
SELECT id, btrim(luc_number), btrim(shop_name), created_by, created_by
FROM public.site_survey_visits
WHERE luc_number IS NOT NULL AND btrim(luc_number) <> '' AND shop_name IS NOT NULL AND btrim(shop_name) <> ''
ON CONFLICT (visit_id, luc_number) DO NOTHING;

COMMENT ON TABLE public.site_survey_visit_lucs IS 'Ambientes de shopping pré-cadastrados por LUC dentro de uma OS.';
COMMENT ON TABLE public.site_survey_visit_luc_history IS 'Histórico imutável de nomes de loja por LUC dentro de cada OS.';