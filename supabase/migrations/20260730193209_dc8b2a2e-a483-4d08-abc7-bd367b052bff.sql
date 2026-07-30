REVOKE ALL ON FUNCTION public.stock_entry_on_receipt() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.log_order_change() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
