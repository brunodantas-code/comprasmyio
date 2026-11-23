CREATE FUNCTION public.spend_supplier_key(_name text) RETURNS text LANGUAGE sql IMMUTABLE SET search_path=public AS $$ SELECT lower(regexp_replace(trim(coalesce(_name,'')), '\s+', ' ', 'g')); $$;
CREATE TABLE public.spend_supplier_allocations (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), supplier text NOT NULL, account_id uuid NOT NULL REFERENCES public.cash_flow_accounts(id), created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT,INSERT,UPDATE,DELETE ON public.spend_supplier_allocations TO authenticated;
GRANT ALL ON public.spend_supplier_allocations TO service_role;
ALTER TABLE public.spend_supplier_allocations ENABLE ROW LEVEL SECURITY;
CREATE POLICY spend_supplier_finance ON public.spend_supplier_allocations FOR ALL TO authenticated USING (public.spend_role()='finance') WITH CHECK (public.spend_role()='finance');
CREATE UNIQUE INDEX spend_supplier_allocations_name ON public.spend_supplier_allocations(public.spend_supplier_key(supplier));
CREATE FUNCTION public.spend_supplier_validate() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN
 NEW.supplier:=trim(NEW.supplier);
 IF NEW.supplier='' THEN RAISE EXCEPTION 'Informe o fornecedor'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.cash_flow_accounts a WHERE a.id=NEW.account_id AND a.active AND a.accepts_entries AND NOT EXISTS(SELECT 1 FROM public.cash_flow_accounts b WHERE b.parent_id=a.id AND b.active)) THEN RAISE EXCEPTION 'Selecione conta contábil válida'; END IF;
 RETURN NEW; END $$;
CREATE TRIGGER spend_supplier_validate BEFORE INSERT OR UPDATE ON public.spend_supplier_allocations FOR EACH ROW EXECUTE FUNCTION public.spend_supplier_validate();
CREATE FUNCTION public.spend_supplier_line_allocate() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE allocation public.spend_supplier_allocations; cid uuid; BEGIN
 IF NEW.status='approved' OR NEW.account_id IS NOT NULL OR public.spend_role() IS DISTINCT FROM 'finance' THEN RETURN NEW; END IF;
 IF TG_OP='UPDATE' AND OLD.account_id IS NOT NULL THEN RETURN NEW; END IF;
 SELECT m.* INTO allocation FROM public.spend_supplier_allocations m JOIN public.cash_flow_accounts a ON a.id=m.account_id WHERE public.spend_supplier_key(m.supplier)=public.spend_supplier_key(NEW.merchant) AND a.active AND a.accepts_entries AND NOT EXISTS(SELECT 1 FROM public.cash_flow_accounts b WHERE b.parent_id=a.id AND b.active);
 IF allocation.id IS NOT NULL THEN NEW.account_id:=allocation.account_id; SELECT card_id INTO cid FROM public.spend_statements WHERE id=NEW.statement_id;
 INSERT INTO public.spend_logs(card_id,actor_id,action,details) VALUES(cid,auth.uid(),'Alocação automática',jsonb_build_object('line_id',NEW.id,'supplier',allocation.supplier,'allocation_id',allocation.id,'account_id',allocation.account_id)); END IF;
 RETURN NEW; END $$;
CREATE TRIGGER spend_supplier_line_allocate BEFORE INSERT OR UPDATE ON public.spend_lines FOR EACH ROW EXECUTE FUNCTION public.spend_supplier_line_allocate();
CREATE FUNCTION public.spend_apply_supplier_allocations() RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE n integer; BEGIN
 IF public.spend_role() IS DISTINCT FROM 'finance' THEN RAISE EXCEPTION 'Somente Financeiro'; END IF;
 UPDATE public.spend_lines l SET account_id=NULL WHERE l.account_id IS NULL AND l.status<>'approved' AND EXISTS(SELECT 1 FROM public.spend_supplier_allocations m JOIN public.cash_flow_accounts a ON a.id=m.account_id WHERE public.spend_supplier_key(m.supplier)=public.spend_supplier_key(l.merchant) AND a.active AND a.accepts_entries AND NOT EXISTS(SELECT 1 FROM public.cash_flow_accounts b WHERE b.parent_id=a.id AND b.active));
 GET DIAGNOSTICS n=ROW_COUNT; RETURN n; END $$;
REVOKE ALL ON FUNCTION public.spend_apply_supplier_allocations() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.spend_apply_supplier_allocations() TO authenticated,service_role;
REVOKE ALL ON FUNCTION public.spend_supplier_line_allocate() FROM PUBLIC,anon,authenticated;
