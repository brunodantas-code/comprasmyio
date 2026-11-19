CREATE FUNCTION public.validate_inventory_integer_counts() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ DECLARE item jsonb; counted numeric; BEGIN
 IF TG_OP='UPDATE' AND OLD.status='completed' THEN RETURN NEW; END IF;
 FOR item IN SELECT value FROM jsonb_array_elements(NEW.items) LOOP
  counted:=nullif(item->>'counted','')::numeric;
  IF counted IS NOT NULL AND (counted::text IN ('NaN','Infinity','-Infinity') OR counted<0 OR counted<>trunc(counted) OR counted>9007199254740991) THEN RAISE EXCEPTION 'Informe uma quantidade inteira, igual ou maior que zero'; END IF;
 END LOOP;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.validate_inventory_integer_counts() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER inventory_integer_counts BEFORE INSERT OR UPDATE ON public.stock_inventories FOR EACH ROW EXECUTE FUNCTION public.validate_inventory_integer_counts();