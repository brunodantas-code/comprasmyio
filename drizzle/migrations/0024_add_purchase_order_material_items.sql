CREATE TABLE public.purchase_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  item_name text NOT NULL,
  item_link text,
  quantity integer NOT NULL CHECK (quantity > 0),
  estimated_unit_value numeric NOT NULL DEFAULT 0 CHECK (estimated_unit_value >= 0),
  material_id uuid REFERENCES public.materials(id) ON DELETE RESTRICT,
  terceiros_material_id uuid REFERENCES public.terceiros_materials(id) ON DELETE RESTRICT,
  tool_asset_id uuid REFERENCES public.tool_assets(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT purchase_order_items_one_catalog_item CHECK (num_nonnulls(material_id, terceiros_material_id, tool_asset_id) = 1),
  CONSTRAINT purchase_order_items_unique_material UNIQUE NULLS NOT DISTINCT (order_id, material_id, terceiros_material_id, tool_asset_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchase_order_items TO authenticated;
GRANT ALL ON public.purchase_order_items TO service_role;

ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "purchase_order_items_select_via_order"
ON public.purchase_order_items FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.purchase_orders po
    WHERE po.id = purchase_order_items.order_id
  )
);

CREATE POLICY "purchase_order_items_insert_own_pending"
ON public.purchase_order_items FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.purchase_orders po
    WHERE po.id = purchase_order_items.order_id
      AND po.requester_id = auth.uid()
      AND po.status = 'pendente'
  )
);

CREATE POLICY "purchase_order_items_update_authorized"
ON public.purchase_order_items FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.purchase_orders po
    WHERE po.id = purchase_order_items.order_id
      AND ((po.requester_id = auth.uid() AND po.status = 'pendente') OR public.is_supply_member(auth.uid()) OR public.is_access_admin(auth.uid()))
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.purchase_orders po
    WHERE po.id = purchase_order_items.order_id
      AND ((po.requester_id = auth.uid() AND po.status = 'pendente') OR public.is_supply_member(auth.uid()) OR public.is_access_admin(auth.uid()))
  )
);

CREATE POLICY "purchase_order_items_delete_authorized"
ON public.purchase_order_items FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.purchase_orders po
    WHERE po.id = purchase_order_items.order_id
      AND ((po.requester_id = auth.uid() AND po.status = 'pendente') OR public.is_supply_member(auth.uid()) OR public.is_access_admin(auth.uid()))
  )
);

CREATE INDEX purchase_order_items_order_id_idx ON public.purchase_order_items(order_id, position);
CREATE INDEX purchase_order_items_material_id_idx ON public.purchase_order_items(material_id) WHERE material_id IS NOT NULL;
CREATE INDEX purchase_order_items_terceiros_material_id_idx ON public.purchase_order_items(terceiros_material_id) WHERE terceiros_material_id IS NOT NULL;
CREATE INDEX purchase_order_items_tool_asset_id_idx ON public.purchase_order_items(tool_asset_id) WHERE tool_asset_id IS NOT NULL;