CREATE OR REPLACE FUNCTION public.register_inventory_signers() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE n text; uid uuid; BEGIN
 IF NEW.status='completed' AND (TG_OP='INSERT' OR OLD.status IS DISTINCT FROM 'completed') THEN
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(NEW.items) item WHERE coalesce((item->>'confirmed')::boolean,false)=false) THEN RAISE EXCEPTION 'Confirme a contagem de cada item antes de concluir'; END IF;
  FOR n IN SELECT DISTINCT unnest(NEW.counters) LOOP
   SELECT CASE WHEN count(*)=1 THEN (array_agg(id))[1] END INTO uid FROM public.profiles WHERE lower(trim(full_name))=lower(trim(n)) AND deleted_at IS NULL AND is_active;
   IF uid IS NOT NULL THEN INSERT INTO public.stock_inventory_signatures(inventory_id,user_id,signer_name) VALUES(NEW.id,uid,n) ON CONFLICT DO NOTHING; END IF;
  END LOOP;
 END IF;
 RETURN NEW;
END $$;