
CREATE TYPE public.deadline_type AS ENUM ('urgente', 'esta_semana', 'este_mes', 'customizado');

ALTER TABLE public.purchase_orders
  ADD COLUMN deadline_type public.deadline_type NOT NULL DEFAULT 'esta_semana',
  ADD COLUMN deadline_date date;

-- Drop policy that depends on status column
DROP POLICY IF EXISTS orders_update_requester_pending ON public.purchase_orders;

CREATE TYPE public.order_status_new AS ENUM ('pendente', 'comprado_aguardando', 'entregue', 'cancelado');

ALTER TABLE public.purchase_orders ALTER COLUMN status DROP DEFAULT;

ALTER TABLE public.purchase_orders
  ALTER COLUMN status TYPE public.order_status_new
  USING (
    CASE status::text
      WHEN 'pendente' THEN 'pendente'
      WHEN 'comprado' THEN 'comprado_aguardando'
      WHEN 'aguardando' THEN 'comprado_aguardando'
      WHEN 'a_caminho' THEN 'comprado_aguardando'
      WHEN 'entregue' THEN 'entregue'
      WHEN 'cancelado' THEN 'cancelado'
      ELSE 'pendente'
    END
  )::public.order_status_new;

ALTER TABLE public.purchase_orders
  ALTER COLUMN status SET DEFAULT 'pendente'::public.order_status_new;

DROP TYPE public.order_status;
ALTER TYPE public.order_status_new RENAME TO order_status;

-- Recreate the policy
CREATE POLICY orders_update_requester_pending ON public.purchase_orders
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = requester_id AND status = 'pendente'::public.order_status)
  WITH CHECK (auth.uid() = requester_id AND status = 'pendente'::public.order_status);
