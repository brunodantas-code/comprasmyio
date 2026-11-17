GRANT DELETE ON public.corporate_messages TO authenticated;
CREATE POLICY "Admin exclui mensagens" ON public.corporate_messages FOR DELETE TO authenticated USING (public.is_erp_admin(auth.uid()));
DROP POLICY "Todos autenticados leem mensagens" ON public.corporate_messages;
CREATE POLICY "Usuarios leem mensagens em exibicao e Admin le historico" ON public.corporate_messages FOR SELECT TO authenticated
  USING (public.is_erp_admin(auth.uid()) OR (starts_at <= (now() AT TIME ZONE 'America/Sao_Paulo')::date AND (ends_at IS NULL OR ends_at >= (now() AT TIME ZONE 'America/Sao_Paulo')::date)));