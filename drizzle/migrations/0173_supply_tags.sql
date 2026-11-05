CREATE TABLE public.supply_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (length(btrim(name)) >= 2),
  description text,
  active boolean NOT NULL DEFAULT true,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX supply_tags_name_unique ON public.supply_tags (lower(btrim(name)));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.supply_tags TO authenticated;
GRANT ALL ON public.supply_tags TO service_role;
ALTER TABLE public.supply_tags ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.can_manage_supply_tags(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_erp_admin(_user_id) OR public.has_role(_user_id,'admin') OR public.has_role(_user_id,'financeiro')
    OR public.has_role(_user_id,'comprador') OR public.is_supply_member(_user_id)
$$;

CREATE POLICY "supply_tags read" ON public.supply_tags FOR SELECT TO authenticated USING (true);
CREATE POLICY "supply_tags insert" ON public.supply_tags FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_supply_tags(auth.uid()) AND created_by = auth.uid());
CREATE POLICY "supply_tags update" ON public.supply_tags FOR UPDATE TO authenticated
  USING (public.can_manage_supply_tags(auth.uid())) WITH CHECK (public.can_manage_supply_tags(auth.uid()));
CREATE POLICY "supply_tags delete" ON public.supply_tags FOR DELETE TO authenticated
  USING (public.can_manage_supply_tags(auth.uid()));

ALTER TABLE public.purchase_orders ADD COLUMN tag_id uuid REFERENCES public.supply_tags(id) ON DELETE RESTRICT;
CREATE INDEX purchase_orders_tag_id_idx ON public.purchase_orders(tag_id);

CREATE OR REPLACE FUNCTION public.validate_purchase_order_tag()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.tag_id IS NULL THEN RETURN NEW; END IF;
  IF NEW.allocation_type IS DISTINCT FROM 'interna' THEN
    RAISE EXCEPTION 'Etiqueta só pode ser usada em solicitações Internas.';
  END IF;
  IF (TG_OP = 'INSERT' OR NEW.tag_id IS DISTINCT FROM OLD.tag_id)
     AND NOT EXISTS (SELECT 1 FROM public.supply_tags WHERE id = NEW.tag_id AND active) THEN
    RAISE EXCEPTION 'Etiqueta inativa ou inexistente.';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER validate_purchase_order_tag BEFORE INSERT OR UPDATE OF tag_id, allocation_type ON public.purchase_orders
FOR EACH ROW EXECUTE FUNCTION public.validate_purchase_order_tag();