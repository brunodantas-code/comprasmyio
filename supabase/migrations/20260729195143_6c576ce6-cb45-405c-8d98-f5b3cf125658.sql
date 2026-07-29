CREATE POLICY "orders_update_requester_receipt" ON public.purchase_orders
FOR UPDATE TO authenticated
USING (auth.uid() = requester_id AND status = 'entregue'::order_status)
WITH CHECK (auth.uid() = requester_id AND status IN ('recebido_ok'::order_status, 'recebido_problema'::order_status));