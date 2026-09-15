DROP POLICY IF EXISTS myio_orders_select_fabrica ON public.myio_orders;
CREATE POLICY myio_orders_select_fabrica
ON public.myio_orders
FOR SELECT
TO authenticated
USING (
  (
    public.has_role(auth.uid(), 'fabrica'::public.app_role)
    OR EXISTS (
      SELECT 1
      FROM public.user_access_profiles AS access
      WHERE access.user_id = auth.uid()
        AND access.profile_definition_id = 'fabrica'
    )
  )
  AND EXISTS (
    SELECT 1
    FROM public.purchase_orders AS purchase
    WHERE purchase.id = myio_orders.purchase_order_id
      AND purchase.approval_status = 'aprovado'
  )
);

DROP POLICY IF EXISTS myio_order_items_select_fabrica ON public.myio_order_items;
CREATE POLICY myio_order_items_select_fabrica
ON public.myio_order_items
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.myio_orders AS request
    JOIN public.purchase_orders AS purchase
      ON purchase.id = request.purchase_order_id
    WHERE request.id = myio_order_items.order_id
      AND purchase.approval_status = 'aprovado'
      AND (
        public.has_role(auth.uid(), 'fabrica'::public.app_role)
        OR EXISTS (
          SELECT 1
          FROM public.user_access_profiles AS access
          WHERE access.user_id = auth.uid()
            AND access.profile_definition_id = 'fabrica'
        )
      )
  )
);