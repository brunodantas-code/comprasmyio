ALTER TABLE public.spend_receipts
  DROP CONSTRAINT spend_receipts_card_independence;

ALTER TABLE public.spend_receipts
  ADD CONSTRAINT spend_receipts_card_independence CHECK (
    (payment_source = 'advance' AND card_id IS NULL)
    OR (payment_source = 'reimbursement')
    OR (payment_source = 'myio_card' AND card_id IS NOT NULL)
  );