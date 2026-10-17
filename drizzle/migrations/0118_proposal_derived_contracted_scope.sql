ALTER TABLE public.site_survey_commercial_proposals ADD COLUMN hydraulic_shops integer CHECK(hydraulic_shops >= 0), ADD COLUMN hydraulic_general integer CHECK(hydraulic_general >= 0), ADD COLUMN electrical integer CHECK(electrical >= 0), ADD COLUMN evidence text;
ALTER TABLE public.site_survey_contracted_scope ADD COLUMN proposal_storage_path text;
CREATE OR REPLACE FUNCTION public.sync_proposal_contracted_scope() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NOT public.can_view_site_survey_visit(NEW.visit_id,auth.uid()) OR NOT public.has_site_survey_permission(auth.uid(),'site_survey_editar') THEN RAISE EXCEPTION 'Sem permissão para alterar proposta comercial.'; END IF;
 INSERT INTO public.site_survey_contracted_scope(visit_id,hydraulic_shops,hydraulic_general,electrical,proposal_storage_path) VALUES(NEW.visit_id,NEW.hydraulic_shops,NEW.hydraulic_general,NEW.electrical,NEW.storage_path) ON CONFLICT(visit_id) DO UPDATE SET hydraulic_shops=EXCLUDED.hydraulic_shops,hydraulic_general=EXCLUDED.hydraulic_general,electrical=EXCLUDED.electrical,proposal_storage_path=EXCLUDED.proposal_storage_path;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.sync_proposal_contracted_scope() FROM PUBLIC;
CREATE TRIGGER proposal_sync_scope AFTER INSERT OR UPDATE ON public.site_survey_commercial_proposals FOR EACH ROW EXECUTE FUNCTION public.sync_proposal_contracted_scope();
REVOKE INSERT,UPDATE,DELETE ON public.site_survey_contracted_scope FROM authenticated;
COMMENT ON COLUMN public.site_survey_contracted_scope.proposal_storage_path IS 'Contracted quantities are derived from this approved proposal; null marks legacy manual values, not displayed as current proposal data.';