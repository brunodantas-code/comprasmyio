GRANT INSERT, UPDATE, DELETE ON public.crm_fases_funil, public.crm_etapas_lead, public.crm_papeis_contato TO authenticated;
ALTER TABLE public.crm_leads ADD COLUMN etapa_codigo text REFERENCES public.crm_etapas_lead(codigo) ON UPDATE CASCADE;
UPDATE public.crm_leads l SET etapa_codigo = e.codigo FROM public.crm_etapas_lead e WHERE e.codigo = l.status;
ALTER TABLE public.crm_contatos ADD COLUMN papel text REFERENCES public.crm_papeis_contato(codigo) ON UPDATE CASCADE;
CREATE FUNCTION public.crm_sync_etapa() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE t text;
BEGIN
 IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status AND NEW.etapa_codigo IS NOT DISTINCT FROM OLD.etapa_codigo THEN
  NEW.etapa_codigo := (SELECT codigo FROM public.crm_etapas_lead WHERE codigo = NEW.status LIMIT 1);
 END IF;
 IF NEW.etapa_codigo IS NOT NULL THEN
  SELECT tipo INTO t FROM public.crm_etapas_lead WHERE codigo=NEW.etapa_codigo;
  IF NEW.etapa_codigo IN ('novo','em_contato','qualificado','convertido','descartado') THEN NEW.status := NEW.etapa_codigo;
  ELSIF t='convertido' THEN NEW.status := 'convertido';
  ELSIF t='descartado' THEN NEW.status := 'descartado';
  ELSE NEW.status := 'em_contato'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER crm_lead_sync_etapa BEFORE INSERT OR UPDATE ON public.crm_leads FOR EACH ROW EXECUTE FUNCTION public.crm_sync_etapa();
CREATE TABLE public.crm_templates_mensagem (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), nome text NOT NULL CHECK (length(trim(nome))>0),
 canal text NOT NULL DEFAULT 'whatsapp' CHECK (canal IN ('whatsapp','email')),
 fase_id uuid REFERENCES public.crm_fases_funil(id), etapa_lead text REFERENCES public.crm_etapas_lead(codigo) ON UPDATE CASCADE,
 assunto text, corpo text NOT NULL CHECK (length(trim(corpo))>0), ativo boolean NOT NULL DEFAULT true,
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_templates_mensagem TO authenticated;
GRANT ALL ON public.crm_templates_mensagem TO service_role;
ALTER TABLE public.crm_templates_mensagem ENABLE ROW LEVEL SECURITY;
CREATE POLICY crm_msg_read ON public.crm_templates_mensagem FOR SELECT TO authenticated USING (private.has_app_access(auth.uid(),'crm'));
CREATE POLICY crm_msg_admin ON public.crm_templates_mensagem FOR ALL TO authenticated USING (public.is_erp_admin(auth.uid())) WITH CHECK (public.is_erp_admin(auth.uid()));
CREATE TRIGGER crm_msg_updated BEFORE UPDATE ON public.crm_templates_mensagem FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();