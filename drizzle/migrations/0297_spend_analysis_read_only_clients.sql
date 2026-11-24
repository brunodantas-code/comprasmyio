REVOKE INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER ON public.spend_receipt_analyses FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.spend_receipt_analyses TO authenticated;
GRANT ALL ON public.spend_receipt_analyses TO service_role;