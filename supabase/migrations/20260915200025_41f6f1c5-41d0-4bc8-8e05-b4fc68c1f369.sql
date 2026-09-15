ALTER FUNCTION public.create_myio_order_request(uuid, uuid, date, boolean, text, text, jsonb) SECURITY INVOKER;

DROP POLICY IF EXISTS "myio_orders_owner_insert" ON public.myio_orders;
CREATE POLICY "myio_orders_owner_insert" ON public.myio_orders
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND public.can_request_type(auth.uid(), 'dispositivos')
  );

DROP POLICY IF EXISTS "myio_order_items_owner_insert" ON public.myio_order_items;
CREATE POLICY "myio_order_items_owner_insert" ON public.myio_order_items
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.myio_orders o
      WHERE o.id = myio_order_items.order_id
        AND o.created_by = auth.uid()
    )
  );