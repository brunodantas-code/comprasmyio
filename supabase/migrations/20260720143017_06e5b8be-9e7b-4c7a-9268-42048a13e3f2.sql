
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS attachments jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Storage policies for bucket order-attachments
CREATE POLICY "authenticated read order-attachments"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'order-attachments');

CREATE POLICY "authenticated upload order-attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'order-attachments');

CREATE POLICY "authenticated update order-attachments"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'order-attachments');

CREATE POLICY "authenticated delete order-attachments"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'order-attachments');
