CREATE OR REPLACE FUNCTION public.spend_reimbursement_payments()
RETURNS TABLE(receipt_id uuid, paid boolean, payment_date date)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    x.id AS receipt_id,
    (o.status = 'entregue') AS paid,
    CASE
      WHEN o.status = 'entregue' THEN COALESCE(
        (
          SELECT max(l.created_at)::date
          FROM public.order_logs l
          WHERE l.order_id = o.id
            AND l.action = 'status_alterado'
            AND l.details->>'para' = 'entregue'
        ),
        o.updated_at::date
      )
      ELSE NULL
    END AS payment_date
  FROM public.spend_receipts x
  JOIN public.purchase_orders o ON o.id = x.reimbursement_order_id
  WHERE x.payment_source = 'reimbursement'
    AND (
      x.holder_id = auth.uid()
      OR x.submitted_by = auth.uid()
      OR public.spend_role() = 'finance'
    );
$$;

REVOKE ALL ON FUNCTION public.spend_reimbursement_payments() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.spend_reimbursement_payments() TO authenticated;