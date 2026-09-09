ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS request_group_id uuid;
ALTER TABLE public.myio_orders ADD COLUMN IF NOT EXISTS request_group_id uuid;
CREATE INDEX IF NOT EXISTS idx_purchase_orders_request_group ON public.purchase_orders(request_group_id);
CREATE INDEX IF NOT EXISTS idx_myio_orders_request_group ON public.myio_orders(request_group_id);

WITH pairs AS (
  SELECT po.id AS po_id, mo.id AS mo_id,
         md5(po.id::text || mo.id::text)::uuid AS g
  FROM public.purchase_orders po
  JOIN public.myio_orders mo
    ON mo.title = po.item_name
   AND mo.created_by = po.requester_id
   AND mo.notes LIKE 'Gerado a partir de solicita%'
   AND abs(extract(epoch from (mo.created_at - po.created_at))) < 600
  WHERE po.request_group_id IS NULL AND mo.request_group_id IS NULL
), u1 AS (
  UPDATE public.purchase_orders p SET request_group_id = pairs.g
  FROM pairs WHERE p.id = pairs.po_id RETURNING 1
)
UPDATE public.myio_orders m SET request_group_id = pairs.g
FROM pairs WHERE m.id = pairs.mo_id;