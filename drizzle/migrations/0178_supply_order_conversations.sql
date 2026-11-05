CREATE TABLE public.supply_order_messages(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),order_id uuid NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,author_id uuid NOT NULL REFERENCES public.profiles(id),recipient_id uuid REFERENCES public.profiles(id),message_type text NOT NULL CHECK(message_type IN ('question','answer')),parent_message_id uuid REFERENCES public.supply_order_messages(id),message text NOT NULL CHECK(length(btrim(message)) BETWEEN 1 AND 4000),created_at timestamptz NOT NULL DEFAULT now(),CHECK((message_type='question' AND parent_message_id IS NULL) OR (message_type='answer' AND parent_message_id IS NOT NULL)));
GRANT SELECT,INSERT ON public.supply_order_messages TO authenticated;
GRANT ALL ON public.supply_order_messages TO service_role;
ALTER TABLE public.supply_order_messages ENABLE ROW LEVEL SECURITY;
CREATE UNIQUE INDEX supply_messages_one_answer ON public.supply_order_messages(parent_message_id) WHERE message_type='answer';
CREATE INDEX supply_messages_order ON public.supply_order_messages(order_id,created_at);
CREATE POLICY "Authorized order readers see conversation" ON public.supply_order_messages FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.purchase_orders o WHERE o.id=order_id));
CREATE POLICY "Requester and buyer send order messages" ON public.supply_order_messages FOR INSERT TO authenticated WITH CHECK(author_id=auth.uid() AND EXISTS(SELECT 1 FROM public.purchase_orders o WHERE o.id=order_id AND (o.requester_id=auth.uid() OR public.can_edit_supply_purchase())));
CREATE OR REPLACE FUNCTION public.guard_supply_order_message() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE o public.purchase_orders%ROWTYPE; parent public.supply_order_messages%ROWTYPE; buyer boolean;
BEGIN
 IF auth.uid() IS NULL OR NEW.author_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Autor inválido.' USING ERRCODE='42501'; END IF;
 SELECT * INTO o FROM public.purchase_orders WHERE id=NEW.order_id FOR UPDATE;
 IF NOT FOUND OR o.status='cancelado' OR o.request_type='pagamento' THEN RAISE EXCEPTION 'Pedido indisponível para conversa.'; END IF;
 buyer:=public.can_edit_supply_purchase();
 IF o.requester_id<>auth.uid() AND NOT buyer THEN RAISE EXCEPTION 'Somente Solicitante e Compras podem conversar.' USING ERRCODE='42501'; END IF;
 IF NEW.message_type='question' THEN
  IF auth.uid()=o.requester_id THEN NEW.recipient_id:=NULL; ELSE NEW.recipient_id:=o.requester_id; END IF;
 ELSE
  SELECT * INTO parent FROM public.supply_order_messages WHERE id=NEW.parent_message_id;
  IF parent.order_id IS DISTINCT FROM NEW.order_id OR parent.message_type IS DISTINCT FROM 'question' OR parent.author_id=auth.uid() THEN RAISE EXCEPTION 'Pergunta inválida.'; END IF;
  IF (parent.recipient_id IS NOT NULL AND parent.recipient_id<>auth.uid()) OR (parent.recipient_id IS NULL AND (NOT buyer OR auth.uid()=o.requester_id)) THEN RAISE EXCEPTION 'Sem permissão para responder.' USING ERRCODE='42501'; END IF;
  IF EXISTS(SELECT 1 FROM public.supply_order_messages WHERE parent_message_id=parent.id) THEN RAISE EXCEPTION 'Pergunta já respondida.'; END IF;
  NEW.recipient_id:=NULL;
 END IF;
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.guard_supply_order_message() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER supply_message_guard BEFORE INSERT ON public.supply_order_messages FOR EACH ROW EXECUTE FUNCTION public.guard_supply_order_message();
CREATE OR REPLACE FUNCTION public.audit_supply_order_message() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 INSERT INTO public.order_logs(order_id,actor_id,action,details) VALUES(NEW.order_id,NEW.author_id,'conversa_'||NEW.message_type,jsonb_build_object('message_id',NEW.id,'parent_message_id',NEW.parent_message_id,'message',NEW.message,'recipient_id',NEW.recipient_id)); RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.audit_supply_order_message() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER supply_message_audit AFTER INSERT ON public.supply_order_messages FOR EACH ROW EXECUTE FUNCTION public.audit_supply_order_message();