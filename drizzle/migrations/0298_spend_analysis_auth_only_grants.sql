REVOKE ALL ON public.spend_receipt_analyses FROM PUBLIC,anon;
GRANT SELECT ON public.spend_receipt_analyses TO authenticated;
GRANT ALL ON public.spend_receipt_analyses TO service_role;