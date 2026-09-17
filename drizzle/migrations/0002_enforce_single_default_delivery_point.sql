CREATE OR REPLACE FUNCTION public.ensure_single_default_delivery_point()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_default THEN
    UPDATE public.delivery_points
    SET is_default = false
    WHERE code <> NEW.code
      AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER delivery_points_single_default_trigger
BEFORE INSERT OR UPDATE OF is_default ON public.delivery_points
FOR EACH ROW
WHEN (NEW.is_default = true)
EXECUTE FUNCTION public.ensure_single_default_delivery_point();