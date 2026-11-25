CREATE OR REPLACE FUNCTION public.spend_set_card_active(_card_id uuid, _active boolean) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF public.spend_role() IS DISTINCT FROM 'finance' THEN RAISE EXCEPTION 'Somente Financeiro'; END IF;
 UPDATE public.spend_cards SET active=_active WHERE id=_card_id AND active IS DISTINCT FROM _active;
 IF FOUND THEN INSERT INTO public.spend_logs(card_id,actor_id,action,details) VALUES(_card_id,auth.uid(),CASE WHEN _active THEN 'card_activated' ELSE 'card_inactivated' END,jsonb_build_object('active',_active)); END IF;
END $$;
REVOKE ALL ON FUNCTION public.spend_set_card_active(uuid,boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.spend_set_card_active(uuid,boolean) TO authenticated;