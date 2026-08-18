CREATE POLICY myio_orders_select_fabrica ON public.myio_orders FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'fabrica'::app_role));
CREATE POLICY myio_order_items_select_fabrica ON public.myio_order_items FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'fabrica'::app_role));
GRANT SELECT ON public.myio_order_items TO authenticated;