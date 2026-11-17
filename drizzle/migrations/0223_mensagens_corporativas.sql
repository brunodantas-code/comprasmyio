CREATE TABLE public.corporate_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message text NOT NULL,
  starts_at date NOT NULL DEFAULT current_date,
  ends_at date,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.corporate_messages TO authenticated;
GRANT ALL ON public.corporate_messages TO service_role;
ALTER TABLE public.corporate_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Todos autenticados leem mensagens" ON public.corporate_messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin cria mensagens" ON public.corporate_messages FOR INSERT TO authenticated WITH CHECK (public.is_erp_admin(auth.uid()) AND created_by = auth.uid());
CREATE POLICY "Admin altera mensagens" ON public.corporate_messages FOR UPDATE TO authenticated USING (public.is_erp_admin(auth.uid())) WITH CHECK (public.is_erp_admin(auth.uid()));
CREATE TRIGGER corporate_messages_updated_at BEFORE UPDATE ON public.corporate_messages FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
INSERT INTO public.corporate_messages (message, starts_at, ends_at, created_by) VALUES
('Novembro é o mês de fecharmos o orçamento de 2027. Todos devem atualizar seus KPIs e OKRs!', '2026-11-01', '2026-11-30', '6ca0eff8-7393-47bc-9054-9001138bcbc2'),
('Churrasco de fim de ano: confirmado dia 06.12 no quiosque do JP, Leblon, RJ.', '2026-11-17', '2026-12-06', '6ca0eff8-7393-47bc-9054-9001138bcbc2');