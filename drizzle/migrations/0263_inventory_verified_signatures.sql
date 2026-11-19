CREATE TABLE public.stock_inventory_signatures (inventory_id uuid NOT NULL REFERENCES public.stock_inventories(id), user_id uuid NOT NULL REFERENCES public.profiles(id), signer_name text NOT NULL, signed_at timestamptz, image text, content_hash text, PRIMARY KEY(inventory_id,user_id));
GRANT SELECT ON public.stock_inventory_signatures TO authenticated;
GRANT ALL ON public.stock_inventory_signatures TO service_role;
ALTER TABLE public.stock_inventory_signatures ENABLE ROW LEVEL SECURITY;
CREATE POLICY inventory_signatures_read ON public.stock_inventory_signatures FOR SELECT TO authenticated USING(user_id=auth.uid() OR EXISTS(SELECT 1 FROM public.stock_inventories i WHERE i.id=inventory_id AND public.can_inventory_area(i.area)));
CREATE FUNCTION public.is_inventory_signer(_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT EXISTS(SELECT 1 FROM public.stock_inventory_signatures WHERE inventory_id=_id AND user_id=auth.uid()); $$;
REVOKE ALL ON FUNCTION public.is_inventory_signer(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.is_inventory_signer(uuid) TO authenticated;
CREATE POLICY inventory_signer_read ON public.stock_inventories FOR SELECT TO authenticated USING(public.is_inventory_signer(id));
CREATE FUNCTION public.register_inventory_signers() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE n text; uid uuid; BEGIN
 IF NEW.status='completed' AND (TG_OP='INSERT' OR OLD.status IS DISTINCT FROM 'completed') THEN
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(NEW.items) item WHERE coalesce((item->>'confirmed')::boolean,false)=false) THEN RAISE EXCEPTION 'Confirme a contagem de cada item antes de concluir'; END IF;
  FOR n IN SELECT DISTINCT unnest(NEW.counters) LOOP
   SELECT CASE WHEN count(*)=1 THEN (array_agg(id))[1] END INTO uid FROM public.profiles WHERE lower(trim(full_name))=lower(trim(n)) AND deleted_at IS NULL AND is_active;
   IF uid IS NULL THEN RAISE EXCEPTION 'Cada inventariante precisa de uma conta ERP ativa e nome único para assinar: %',n; END IF;
   INSERT INTO public.stock_inventory_signatures(inventory_id,user_id,signer_name) VALUES(NEW.id,uid,n) ON CONFLICT DO NOTHING;
  END LOOP;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER inventory_signers_on_completion AFTER INSERT OR UPDATE ON public.stock_inventories FOR EACH ROW EXECUTE FUNCTION public.register_inventory_signers();
CREATE FUNCTION public.apply_verified_inventory_signature(_inventory_id uuid,_user_id uuid,_expected_completed_at timestamptz) RETURNS timestamptz LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE r public.stock_inventories; s public.stock_inventory_signatures; png text; t timestamptz:=clock_timestamp(); BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'Acesso negado'; END IF;
 SELECT * INTO r FROM public.stock_inventories WHERE id=_inventory_id FOR UPDATE;
 IF r.id IS NULL OR r.status<>'completed' OR r.completed_at IS DISTINCT FROM _expected_completed_at THEN RAISE EXCEPTION 'Inventário indisponível. Reabra antes de assinar'; END IF;
 SELECT * INTO s FROM public.stock_inventory_signatures WHERE inventory_id=_inventory_id AND user_id=_user_id FOR UPDATE;
 IF s.user_id IS NULL THEN RAISE EXCEPTION 'Você só pode assinar sua própria contagem'; END IF;
 IF s.signed_at IS NOT NULL THEN RAISE EXCEPTION 'Assinatura já registrada'; END IF;
 SELECT image INTO png FROM public.user_signatures WHERE user_id=_user_id;
 IF png IS NULL OR NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=_user_id AND is_active AND deleted_at IS NULL) THEN RAISE EXCEPTION 'Cadastre sua assinatura e verifique seu acesso'; END IF;
 UPDATE public.stock_inventory_signatures SET signed_at=t,image=png,content_hash=md5(jsonb_build_object('name',r.name,'date',r.inventory_date,'counters',r.counters,'items',r.items)::text) WHERE inventory_id=_inventory_id AND user_id=_user_id;
 RETURN t;
END $$;
REVOKE ALL ON FUNCTION public.apply_verified_inventory_signature(uuid,uuid,timestamptz) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.apply_verified_inventory_signature(uuid,uuid,timestamptz) TO service_role;