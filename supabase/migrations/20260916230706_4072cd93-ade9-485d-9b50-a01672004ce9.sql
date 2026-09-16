DROP POLICY IF EXISTS "Authorized users can read order attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authorized users can upload order attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authorized users can update order attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authorized users can delete order attachments" ON storage.objects;

CREATE POLICY "Authorized users can read order attachments"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'order-attachments'
  AND (
    EXISTS (
      SELECT 1
      FROM public.purchase_orders po
      WHERE po.id::text = (storage.foldername(name))[1]
    )
    OR (
      (storage.foldername(name))[1] = 'imports'
      AND EXISTS (
        SELECT 1
        FROM public.import_batches ib
        WHERE ib.id::text = (storage.foldername(name))[2]
          AND (
            ib.created_by = auth.uid()
            OR public.has_role(auth.uid(), 'comprador'::public.app_role)
            OR public.has_role(auth.uid(), 'admin'::public.app_role)
            OR public.can_manage_limits(auth.uid())
          )
      )
    )
  )
);

CREATE POLICY "Authorized users can upload order attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'order-attachments'
  AND (
    EXISTS (
      SELECT 1
      FROM public.purchase_orders po
      WHERE po.id::text = (storage.foldername(name))[1]
        AND (
          (po.requester_id = auth.uid() AND po.status = 'pendente')
          OR public.has_role(auth.uid(), 'comprador'::public.app_role)
          OR public.has_role(auth.uid(), 'admin'::public.app_role)
          OR public.can_manage_limits(auth.uid())
        )
    )
    OR (
      (storage.foldername(name))[1] = 'imports'
      AND EXISTS (
        SELECT 1
        FROM public.import_batches ib
        WHERE ib.id::text = (storage.foldername(name))[2]
          AND (
            ib.created_by = auth.uid()
            OR public.has_role(auth.uid(), 'comprador'::public.app_role)
            OR public.has_role(auth.uid(), 'admin'::public.app_role)
            OR public.can_manage_limits(auth.uid())
          )
      )
    )
  )
);

CREATE POLICY "Authorized users can update order attachments"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'order-attachments'
  AND (
    EXISTS (
      SELECT 1
      FROM public.purchase_orders po
      WHERE po.id::text = (storage.foldername(name))[1]
        AND (
          (po.requester_id = auth.uid() AND po.status = 'pendente')
          OR public.has_role(auth.uid(), 'comprador'::public.app_role)
          OR public.has_role(auth.uid(), 'admin'::public.app_role)
          OR public.can_manage_limits(auth.uid())
        )
    )
    OR (
      (storage.foldername(name))[1] = 'imports'
      AND EXISTS (
        SELECT 1
        FROM public.import_batches ib
        WHERE ib.id::text = (storage.foldername(name))[2]
          AND (
            ib.created_by = auth.uid()
            OR public.has_role(auth.uid(), 'comprador'::public.app_role)
            OR public.has_role(auth.uid(), 'admin'::public.app_role)
            OR public.can_manage_limits(auth.uid())
          )
      )
    )
  )
)
WITH CHECK (
  bucket_id = 'order-attachments'
  AND (
    EXISTS (
      SELECT 1
      FROM public.purchase_orders po
      WHERE po.id::text = (storage.foldername(name))[1]
        AND (
          (po.requester_id = auth.uid() AND po.status = 'pendente')
          OR public.has_role(auth.uid(), 'comprador'::public.app_role)
          OR public.has_role(auth.uid(), 'admin'::public.app_role)
          OR public.can_manage_limits(auth.uid())
        )
    )
    OR (
      (storage.foldername(name))[1] = 'imports'
      AND EXISTS (
        SELECT 1
        FROM public.import_batches ib
        WHERE ib.id::text = (storage.foldername(name))[2]
          AND (
            ib.created_by = auth.uid()
            OR public.has_role(auth.uid(), 'comprador'::public.app_role)
            OR public.has_role(auth.uid(), 'admin'::public.app_role)
            OR public.can_manage_limits(auth.uid())
          )
      )
    )
  )
);

CREATE POLICY "Authorized users can delete order attachments"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'order-attachments'
  AND (
    EXISTS (
      SELECT 1
      FROM public.purchase_orders po
      WHERE po.id::text = (storage.foldername(name))[1]
        AND (
          (po.requester_id = auth.uid() AND po.status = 'pendente')
          OR public.has_role(auth.uid(), 'comprador'::public.app_role)
          OR public.has_role(auth.uid(), 'admin'::public.app_role)
          OR public.can_manage_limits(auth.uid())
        )
    )
    OR (
      (storage.foldername(name))[1] = 'imports'
      AND EXISTS (
        SELECT 1
        FROM public.import_batches ib
        WHERE ib.id::text = (storage.foldername(name))[2]
          AND (
            ib.created_by = auth.uid()
            OR public.has_role(auth.uid(), 'comprador'::public.app_role)
            OR public.has_role(auth.uid(), 'admin'::public.app_role)
            OR public.can_manage_limits(auth.uid())
          )
      )
    )
  )
);