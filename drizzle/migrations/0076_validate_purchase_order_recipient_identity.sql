CREATE OR REPLACE FUNCTION public.resolve_purchase_order_recipient() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE matching_count integer;
BEGIN
  IF NEW.recipient IS NULL OR btrim(NEW.recipient) = '' THEN
    NEW.recipient_user_id := NULL;
    RETURN NEW;
  END IF;
  IF NEW.recipient_user_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = NEW.recipient_user_id AND p.deleted_at IS NULL
    AND (lower(btrim(p.full_name)) = lower(btrim(NEW.recipient)) OR lower(btrim(p.email)) = lower(btrim(NEW.recipient)))
  ) THEN RETURN NEW; END IF;
  SELECT count(*), min(id) INTO matching_count, NEW.recipient_user_id
  FROM public.profiles p WHERE p.deleted_at IS NULL
    AND (lower(btrim(p.full_name)) = lower(btrim(NEW.recipient)) OR lower(btrim(p.email)) = lower(btrim(NEW.recipient)));
  IF matching_count <> 1 THEN NEW.recipient_user_id := NULL; END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER resolve_purchase_order_recipient_before_insert BEFORE INSERT ON public.purchase_orders FOR EACH ROW EXECUTE FUNCTION public.resolve_purchase_order_recipient();