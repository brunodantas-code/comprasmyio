ALTER TABLE public.purchase_orders ADD COLUMN recipient_user_id uuid;
CREATE INDEX purchase_orders_recipient_user_id_idx ON public.purchase_orders (recipient_user_id);
CREATE OR REPLACE FUNCTION public.resolve_purchase_order_recipient() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.recipient_user_id IS NOT NULL AND NEW.recipient IS NOT DISTINCT FROM OLD.recipient THEN
    RETURN NEW;
  END IF;
  SELECT p.id INTO NEW.recipient_user_id
  FROM public.profiles p
  WHERE p.deleted_at IS NULL
    AND (lower(btrim(p.full_name)) = lower(btrim(NEW.recipient)) OR lower(btrim(p.email)) = lower(btrim(NEW.recipient)))
  ORDER BY CASE WHEN lower(btrim(p.email)) = lower(btrim(NEW.recipient)) THEN 0 ELSE 1 END, p.id
  LIMIT 1;
  RETURN NEW;
END; $$;
CREATE TRIGGER resolve_purchase_order_recipient_before_write BEFORE UPDATE OF recipient,recipient_user_id ON public.purchase_orders FOR EACH ROW EXECUTE FUNCTION public.resolve_purchase_order_recipient();
UPDATE public.purchase_orders o SET recipient_user_id = p.id FROM public.profiles p WHERE p.deleted_at IS NULL AND (lower(btrim(o.recipient)) = lower(btrim(p.full_name)) OR lower(btrim(o.recipient)) = lower(btrim(p.email))) AND NOT EXISTS (SELECT 1 FROM public.profiles other WHERE other.id <> p.id AND other.deleted_at IS NULL AND (lower(btrim(o.recipient)) = lower(btrim(other.full_name)) OR lower(btrim(o.recipient)) = lower(btrim(other.email))));
CREATE POLICY orders_select_recipient ON public.purchase_orders FOR SELECT TO authenticated USING (recipient_user_id = auth.uid());