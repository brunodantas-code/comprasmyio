CREATE OR REPLACE FUNCTION public.resolve_purchase_order_recipient()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  matching_ids uuid[];
BEGIN
  IF NEW.recipient IS NULL OR btrim(NEW.recipient) = '' THEN
    NEW.recipient_user_id := NULL;
    RETURN NEW;
  END IF;

  IF NEW.recipient_user_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = NEW.recipient_user_id
      AND p.deleted_at IS NULL
      AND (lower(btrim(p.full_name)) = lower(btrim(NEW.recipient))
        OR lower(btrim(p.email)) = lower(btrim(NEW.recipient)))
  ) THEN
    RETURN NEW;
  END IF;

  SELECT array_agg(p.id) INTO matching_ids
  FROM public.profiles p
  WHERE p.deleted_at IS NULL
    AND (lower(btrim(p.full_name)) = lower(btrim(NEW.recipient))
      OR lower(btrim(p.email)) = lower(btrim(NEW.recipient)));

  IF cardinality(matching_ids) = 1 THEN
    NEW.recipient_user_id := matching_ids[1];
  ELSE
    NEW.recipient_user_id := NULL;
  END IF;
  RETURN NEW;
END;
$$;