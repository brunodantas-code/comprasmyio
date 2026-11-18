ALTER TABLE public.pm_projects ADD COLUMN budget_mode text NOT NULL DEFAULT 'estimated' CHECK(budget_mode IN ('detailed','estimated','none')), ADD COLUMN budget_details jsonb NOT NULL DEFAULT '[]'::jsonb;
CREATE TABLE public.pm_budget_accounts(account_id uuid PRIMARY KEY REFERENCES public.cash_flow_accounts(id));
GRANT SELECT,INSERT,DELETE ON public.pm_budget_accounts TO authenticated; GRANT ALL ON public.pm_budget_accounts TO service_role;
ALTER TABLE public.pm_budget_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY pm_budget_accounts_read ON public.pm_budget_accounts FOR SELECT TO authenticated USING(private.has_app_access(auth.uid(),'projects') OR public.is_erp_admin(auth.uid()));
CREATE POLICY pm_budget_accounts_admin ON public.pm_budget_accounts FOR ALL TO authenticated USING(public.is_erp_admin(auth.uid())) WITH CHECK(public.is_erp_admin(auth.uid()));
CREATE FUNCTION public.pm_budget_catalog() RETURNS TABLE(id uuid,code text,name text,selected boolean) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT a.id,a.code,a.name,EXISTS(SELECT 1 FROM public.pm_budget_accounts b WHERE b.account_id=a.id) FROM public.cash_flow_accounts a WHERE a.active AND a.nature='despesa' AND (private.has_app_access(auth.uid(),'projects') OR public.is_erp_admin(auth.uid())) ORDER BY a.code $$;
CREATE FUNCTION public.pm_supply_catalog() RETURNS TABLE(id uuid,name text,project_type text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT p.id,p.name,p.project_type FROM public.projects p WHERE private.has_app_access(auth.uid(),'projects') ORDER BY p.name $$;
REVOKE ALL ON FUNCTION public.pm_budget_catalog(),public.pm_supply_catalog() FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.pm_budget_catalog(),public.pm_supply_catalog() TO authenticated,service_role;
CREATE FUNCTION public.pm_name_key(n text) RETURNS text LANGUAGE sql IMMUTABLE SET search_path=public AS $$ SELECT regexp_replace(lower(translate(n,'áàâãéèêíìîóòôõúùûç','aaaaeeeiiioooouuuc')),'[^a-z0-9]','','g') $$;
CREATE FUNCTION public.pm_budget_identity_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE matched uuid; item jsonb; total numeric:=0; BEGIN
 PERFORM pg_advisory_xact_lock(7324091);
 SELECT id INTO matched FROM public.projects WHERE public.pm_name_key(name)=public.pm_name_key(NEW.name) ORDER BY created_at LIMIT 1;
 IF matched IS NOT NULL THEN IF NEW.erp_project_id IS NOT NULL AND NEW.erp_project_id<>matched THEN RAISE EXCEPTION 'O nome corresponde a outro projeto do Supply. Selecione o vínculo correto.'; END IF; NEW.erp_project_id:=matched; END IF;
 IF NEW.erp_project_id IS NOT NULL AND EXISTS(SELECT 1 FROM public.pm_projects WHERE erp_project_id=NEW.erp_project_id AND id<>NEW.id) THEN RAISE EXCEPTION 'Este projeto do Supply já possui planejamento no Projects.'; END IF;
 IF EXISTS(SELECT 1 FROM public.pm_projects WHERE public.pm_name_key(name)=public.pm_name_key(NEW.name) AND id<>NEW.id) THEN RAISE EXCEPTION 'Já existe um planejamento com este nome.'; END IF;
 IF jsonb_typeof(NEW.budget_details)<>'array' THEN RAISE EXCEPTION 'Detalhamento inválido'; END IF;
 IF NEW.budget_mode='detailed' THEN
  IF jsonb_array_length(NEW.budget_details)=0 THEN RAISE EXCEPTION 'Informe ao menos uma conta no orçamento detalhado.'; END IF;
  FOR item IN SELECT value FROM jsonb_array_elements(NEW.budget_details) LOOP
   IF NOT EXISTS(SELECT 1 FROM public.cash_flow_accounts WHERE id=(item->>'account_id')::uuid AND nature='despesa') OR (item->>'amount') IS NULL OR (item->>'amount')::numeric<0 THEN RAISE EXCEPTION 'Conta ou valor inválido no orçamento'; END IF;
   total:=total+(item->>'amount')::numeric;
  END LOOP;
  IF (SELECT count(DISTINCT value->>'account_id') FROM jsonb_array_elements(NEW.budget_details))<>jsonb_array_length(NEW.budget_details) THEN RAISE EXCEPTION 'Conta repetida no orçamento'; END IF;
  NEW.budget:=total;
 ELSIF NEW.budget_mode='none' THEN NEW.budget:=0; END IF;
 RETURN NEW;
 END $$;
REVOKE ALL ON FUNCTION public.pm_budget_identity_guard() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER pm_budget_identity BEFORE INSERT OR UPDATE ON public.pm_projects FOR EACH ROW EXECUTE FUNCTION public.pm_budget_identity_guard();