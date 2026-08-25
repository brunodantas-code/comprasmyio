ALTER VIEW public.terceiros_material_stock SET (security_invoker = on);
REVOKE EXECUTE ON FUNCTION public.prevent_negative_stock_terceiros() FROM anon, authenticated, public;