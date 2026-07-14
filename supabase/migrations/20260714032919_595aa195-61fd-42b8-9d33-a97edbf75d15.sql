
-- Enum de pap\u00e9is
CREATE TYPE public.app_role AS ENUM ('admin', 'comprador', 'solicitante');

-- Enum de status
CREATE TYPE public.order_status AS ENUM ('pendente', 'comprado', 'aguardando', 'a_caminho', 'cancelado', 'entregue');

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_all_auth" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update_self" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_insert_self" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- User roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE POLICY "user_roles_select_self" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "user_roles_admin_all" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Trigger: cria profile + role no signup. Primeiro usu\u00e1rio vira admin.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  is_first BOOLEAN;
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), NEW.email);

  SELECT NOT EXISTS (SELECT 1 FROM public.user_roles) INTO is_first;
  IF is_first THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'solicitante');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Projects
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT ALL ON public.projects TO service_role;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "projects_select_auth" ON public.projects FOR SELECT TO authenticated USING (true);
CREATE POLICY "projects_admin_all" ON public.projects FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Purchase orders
CREATE TABLE public.purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE RESTRICT,
  requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  item_link TEXT NOT NULL,
  delivery_point TEXT NOT NULL,
  status order_status NOT NULL DEFAULT 'pendente',
  buyer_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchase_orders TO authenticated;
GRANT ALL ON public.purchase_orders TO service_role;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "orders_select_own_or_buyer_admin" ON public.purchase_orders FOR SELECT TO authenticated
USING (
  requester_id = auth.uid()
  OR public.has_role(auth.uid(), 'comprador')
  OR public.has_role(auth.uid(), 'admin')
);
CREATE POLICY "orders_insert_own" ON public.purchase_orders FOR INSERT TO authenticated
WITH CHECK (requester_id = auth.uid());
CREATE POLICY "orders_update_requester_pending" ON public.purchase_orders FOR UPDATE TO authenticated
USING (requester_id = auth.uid() AND status = 'pendente')
WITH CHECK (requester_id = auth.uid());
CREATE POLICY "orders_update_buyer" ON public.purchase_orders FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'comprador') OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'comprador') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "orders_delete_admin" ON public.purchase_orders FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER orders_updated_at BEFORE UPDATE ON public.purchase_orders
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Order logs
CREATE TABLE public.order_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.order_logs TO authenticated;
GRANT ALL ON public.order_logs TO service_role;
ALTER TABLE public.order_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "logs_select" ON public.order_logs FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'comprador')
  OR EXISTS (SELECT 1 FROM public.purchase_orders o WHERE o.id = order_id AND o.requester_id = auth.uid())
);
CREATE POLICY "logs_insert_auth" ON public.order_logs FOR INSERT TO authenticated
WITH CHECK (actor_id = auth.uid());

-- Trigger de log em mudan\u00e7as
CREATE OR REPLACE FUNCTION public.log_order_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.order_logs (order_id, actor_id, action, details)
    VALUES (NEW.id, NEW.requester_id, 'criado', jsonb_build_object('status', NEW.status, 'item', NEW.item_name));
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      INSERT INTO public.order_logs (order_id, actor_id, action, details)
      VALUES (NEW.id, auth.uid(), 'status_alterado', jsonb_build_object('de', OLD.status, 'para', NEW.status));
    END IF;
    IF NEW.buyer_notes IS DISTINCT FROM OLD.buyer_notes THEN
      INSERT INTO public.order_logs (order_id, actor_id, action, details)
      VALUES (NEW.id, auth.uid(), 'observacao_atualizada', jsonb_build_object('observacao', NEW.buyer_notes));
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER orders_log_trigger
AFTER INSERT OR UPDATE ON public.purchase_orders
FOR EACH ROW EXECUTE FUNCTION public.log_order_change();
