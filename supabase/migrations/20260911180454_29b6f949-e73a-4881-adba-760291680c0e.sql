DROP TRIGGER IF EXISTS trg_log_order_change ON public.purchase_orders;

WITH ranked_duplicates AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY order_id, actor_id, action, details, created_at
      ORDER BY id
    ) AS duplicate_position
  FROM public.order_logs
)
DELETE FROM public.order_logs AS logs
USING ranked_duplicates AS duplicates
WHERE logs.id = duplicates.id
  AND duplicates.duplicate_position > 1;