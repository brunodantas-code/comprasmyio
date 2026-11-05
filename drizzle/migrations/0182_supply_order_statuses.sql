CREATE TABLE public.supply_order_statuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  system_code public.order_status UNIQUE,
  label text NOT NULL,
  position integer NOT NULL DEFAULT 100,
  active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT supply_order_statuses_label_len CHECK (char_length(btrim(label)) BETWEEN 2 AND 40)
);
CREATE UNIQUE INDEX supply_order_statuses_label_uniq ON public.supply_order_statuses (lower(btrim(label)));
GRANT SELECT ON public.supply_order_statuses TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.supply_order_statuses TO authenticated;
GRANT ALL ON public.supply_order_statuses TO service_role;
ALTER TABLE public.supply_order_statuses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read statuses" ON public.supply_order_statuses FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert custom statuses" ON public.supply_order_statuses FOR INSERT TO authenticated
  WITH CHECK (system_code IS NULL AND public.can_manage_supply_tags(auth.uid()) AND created_by = auth.uid());
CREATE POLICY "update statuses" ON public.supply_order_statuses FOR UPDATE TO authenticated
  USING (public.can_manage_supply_tags(auth.uid())) WITH CHECK (public.can_manage_supply_tags(auth.uid()));
CREATE POLICY "delete custom statuses" ON public.supply_order_statuses FOR DELETE TO authenticated
  USING (system_code IS NULL AND public.can_manage_supply_tags(auth.uid()));

-- system rows keep their code; only label/position may change, never active=false
CREATE OR REPLACE FUNCTION public.guard_supply_order_status() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF OLD.system_code IS DISTINCT FROM NEW.system_code THEN RAISE EXCEPTION 'Situação original não pode mudar de código'; END IF;
  IF NEW.system_code IS NOT NULL AND NOT NEW.active THEN RAISE EXCEPTION 'Situações originais não podem ser inativadas'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER guard_supply_order_status BEFORE UPDATE ON public.supply_order_statuses FOR EACH ROW EXECUTE FUNCTION public.guard_supply_order_status();

INSERT INTO public.supply_order_statuses (system_code, label, position) VALUES
 ('pendente','Pendente',10),('comprado_aguardando','Comprado e aguardando envio',20),('entregue','Entregue',30),
 ('cancelado','Cancelado',40),('recebido_ok','Conforme',50),('recebido_problema','Não Conforme',60);

ALTER TABLE public.purchase_orders ADD COLUMN custom_status_id uuid REFERENCES public.supply_order_statuses(id) ON DELETE SET NULL;

-- clearing custom status when the system status changes; log custom changes
CREATE OR REPLACE FUNCTION public.supply_custom_status_change() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.custom_status_id IS NOT DISTINCT FROM OLD.custom_status_id THEN
    NEW.custom_status_id := NULL;
  END IF;
  IF NEW.custom_status_id IS DISTINCT FROM OLD.custom_status_id AND NEW.custom_status_id IS NOT NULL THEN
    INSERT INTO public.order_logs(order_id, actor_id, action, details)
    VALUES (NEW.id, auth.uid(), 'status_alterado', jsonb_build_object('de', OLD.status, 'para_custom', (SELECT label FROM public.supply_order_statuses WHERE id = NEW.custom_status_id)));
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER supply_custom_status_change BEFORE UPDATE ON public.purchase_orders FOR EACH ROW EXECUTE FUNCTION public.supply_custom_status_change();