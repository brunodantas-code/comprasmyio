ALTER FUNCTION public.set_purchase_order_request_model() SECURITY INVOKER;
REVOKE ALL ON FUNCTION public.set_purchase_order_request_model() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_purchase_order_request_model() TO service_role;