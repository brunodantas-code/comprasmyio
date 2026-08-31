ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS approval_limit numeric NOT NULL DEFAULT 0;

ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS estimated_value numeric NOT NULL DEFAULT 0;
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'aprovado';
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES auth.users(id);
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS approved_at timestamptz;

CREATE OR REPLACE FUNCTION public.can_manage_limits(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin','ceo','coo','cfo')
  );
$$;

DROP POLICY IF EXISTS profiles_update_limits_admin ON public.profiles;
CREATE POLICY profiles_update_limits_admin ON public.profiles
FOR UPDATE TO authenticated
USING (public.can_manage_limits(auth.uid()))
WITH CHECK (public.can_manage_limits(auth.uid()));

DROP POLICY IF EXISTS orders_select_own_or_buyer_admin ON public.purchase_orders;
CREATE POLICY orders_select_own_or_buyer_admin ON public.purchase_orders
FOR SELECT TO authenticated
USING (
  requester_id = auth.uid()
  OR has_role(auth.uid(), 'admin'::app_role)
  OR public.can_manage_limits(auth.uid())
  OR (has_role(auth.uid(), 'comprador'::app_role) AND approval_status = 'aprovado')
);

DROP POLICY IF EXISTS orders_update_approvers ON public.purchase_orders;
CREATE POLICY orders_update_approvers ON public.purchase_orders
FOR UPDATE TO authenticated
USING (public.can_manage_limits(auth.uid()))
WITH CHECK (public.can_manage_limits(auth.uid()));

CREATE OR REPLACE FUNCTION public.set_order_approval_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  lim numeric;
BEGIN
  SELECT COALESCE(approval_limit, 0) INTO lim FROM public.profiles WHERE id = NEW.requester_id;
  IF COALESCE(NEW.estimated_value, 0) > COALESCE(lim, 0) THEN
    NEW.approval_status := 'aguardando_aprovacao';
  ELSE
    NEW.approval_status := 'aprovado';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_order_approval_status ON public.purchase_orders;
CREATE TRIGGER trg_set_order_approval_status
BEFORE INSERT ON public.purchase_orders
FOR EACH ROW EXECUTE FUNCTION public.set_order_approval_status();