-- CRM myio integrado ao ERP — Fase 1: núcleo comercial
-- Usuários do CRM são os próprios usuários do ERP (user_app_access 'crm'); ids de usuário são UUIDs simples.

-- Empresas e contatos --------------------------------------------------
CREATE TABLE public.crm_empresas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  razao_social text,
  nome_fantasia text NOT NULL,
  cnpj text UNIQUE,
  segmento text CHECK (segmento IN ('shopping','hospital','logistica','industria','facilities','varejo','ferroviario','outro')),
  cidade text,
  uf char(2),
  grupo_economico text,
  dominio text,
  observacoes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX crm_empresas_nome_idx ON public.crm_empresas (lower(nome_fantasia));
CREATE INDEX crm_empresas_dominio_idx ON public.crm_empresas (dominio);
CREATE TRIGGER crm_empresas_updated BEFORE UPDATE ON public.crm_empresas FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_empresas TO authenticated;
GRANT ALL ON public.crm_empresas TO service_role;
ALTER TABLE public.crm_empresas ENABLE ROW LEVEL SECURITY;
CREATE POLICY crm_empresas_select ON public.crm_empresas FOR SELECT TO authenticated USING (private.has_app_access(auth.uid(), 'crm'));
CREATE POLICY crm_empresas_insert ON public.crm_empresas FOR INSERT TO authenticated WITH CHECK (private.has_app_access(auth.uid(), 'crm'));
CREATE POLICY crm_empresas_update ON public.crm_empresas FOR UPDATE TO authenticated USING (private.has_app_access(auth.uid(), 'crm')) WITH CHECK (private.has_app_access(auth.uid(), 'crm'));
CREATE POLICY crm_empresas_delete ON public.crm_empresas FOR DELETE TO authenticated USING (private.has_app_access(auth.uid(), 'crm'));

CREATE TABLE public.crm_contatos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.crm_empresas(id) ON DELETE CASCADE,
  nome text NOT NULL,
  cargo text,
  email text,
  telefone text,
  observacoes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX crm_contatos_empresa_idx ON public.crm_contatos (empresa_id);
CREATE INDEX crm_contatos_email_idx ON public.crm_contatos (lower(email));
CREATE TRIGGER crm_contatos_updated BEFORE UPDATE ON public.crm_contatos FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_contatos TO authenticated;
GRANT ALL ON public.crm_contatos TO service_role;
ALTER TABLE public.crm_contatos ENABLE ROW LEVEL SECURITY;
CREATE POLICY crm_contatos_select ON public.crm_contatos FOR SELECT TO authenticated USING (private.has_app_access(auth.uid(), 'crm'));
CREATE POLICY crm_contatos_insert ON public.crm_contatos FOR INSERT TO authenticated WITH CHECK (private.has_app_access(auth.uid(), 'crm'));
CREATE POLICY crm_contatos_update ON public.crm_contatos FOR UPDATE TO authenticated USING (private.has_app_access(auth.uid(), 'crm')) WITH CHECK (private.has_app_access(auth.uid(), 'crm'));
CREATE POLICY crm_contatos_delete ON public.crm_contatos FOR DELETE TO authenticated USING (private.has_app_access(auth.uid(), 'crm'));

-- Papéis de contato (configuração; escrita só Admin ERP) ----------------
CREATE TABLE public.crm_papeis_contato (
  codigo text PRIMARY KEY,
  nome text NOT NULL,
  ordem int NOT NULL DEFAULT 0,
  decisor_padrao boolean NOT NULL DEFAULT false,
  ativo boolean NOT NULL DEFAULT true
);
GRANT SELECT ON public.crm_papeis_contato TO authenticated;
GRANT ALL ON public.crm_papeis_contato TO service_role;
ALTER TABLE public.crm_papeis_contato ENABLE ROW LEVEL SECURITY;
CREATE POLICY crm_papeis_select ON public.crm_papeis_contato FOR SELECT TO authenticated USING (private.has_app_access(auth.uid(), 'crm'));
CREATE POLICY crm_papeis_admin ON public.crm_papeis_contato FOR ALL TO authenticated USING (private.is_erp_admin(auth.uid())) WITH CHECK (private.is_erp_admin(auth.uid()));

-- Fases do funil (configuração; escrita só Admin ERP) -------------------
CREATE TABLE public.crm_fases_funil (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  ordem int NOT NULL,
  probabilidade int NOT NULL DEFAULT 0 CHECK (probabilidade BETWEEN 0 AND 100),
  tempo_max_dias int,
  checklist_saida jsonb NOT NULL DEFAULT '[]'::jsonb,
  tipo text NOT NULL DEFAULT 'aberta' CHECK (tipo IN ('aberta','ganho','perdido','desqualificado')),
  cor text,
  ativa boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER crm_fases_updated BEFORE UPDATE ON public.crm_fases_funil FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
GRANT SELECT ON public.crm_fases_funil TO authenticated;
GRANT ALL ON public.crm_fases_funil TO service_role;
ALTER TABLE public.crm_fases_funil ENABLE ROW LEVEL SECURITY;
CREATE POLICY crm_fases_select ON public.crm_fases_funil FOR SELECT TO authenticated USING (private.has_app_access(auth.uid(), 'crm'));
CREATE POLICY crm_fases_admin ON public.crm_fases_funil FOR ALL TO authenticated USING (private.is_erp_admin(auth.uid())) WITH CHECK (private.is_erp_admin(auth.uid()));

-- Leads ------------------------------------------------------------------
CREATE TABLE public.crm_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  empresa_texto text,
  cargo text,
  email text,
  telefone text,
  cnpj text,
  origem text NOT NULL DEFAULT 'outro' CHECK (origem IN ('feira','linkedin','indicacao','inbound','outro')),
  origem_detalhe text,
  dono_id uuid,
  status text NOT NULL DEFAULT 'novo' CHECK (status IN ('novo','em_contato','qualificado','convertido','descartado')),
  observacoes text,
  oportunidade_id uuid,
  empresa_id uuid REFERENCES public.crm_empresas(id),
  toques int NOT NULL DEFAULT 0,
  interesses text,
  papel text REFERENCES public.crm_papeis_contato(codigo) ON UPDATE CASCADE,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX crm_leads_dono_idx ON public.crm_leads (dono_id);
CREATE INDEX crm_leads_email_idx ON public.crm_leads (lower(email));
CREATE TRIGGER crm_leads_updated BEFORE UPDATE ON public.crm_leads FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_leads TO authenticated;
GRANT ALL ON public.crm_leads TO service_role;
ALTER TABLE public.crm_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY crm_leads_select ON public.crm_leads FOR SELECT TO authenticated USING (private.has_app_access(auth.uid(), 'crm'));
CREATE POLICY crm_leads_insert ON public.crm_leads FOR INSERT TO authenticated WITH CHECK (private.has_app_access(auth.uid(), 'crm'));
CREATE POLICY crm_leads_update ON public.crm_leads FOR UPDATE TO authenticated USING (private.has_app_access(auth.uid(), 'crm')) WITH CHECK (private.has_app_access(auth.uid(), 'crm'));
CREATE POLICY crm_leads_delete ON public.crm_leads FOR DELETE TO authenticated USING (private.has_app_access(auth.uid(), 'crm'));

CREATE TABLE public.crm_lead_contatos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  nome text NOT NULL,
  cargo text,
  papel text REFERENCES public.crm_papeis_contato(codigo) ON UPDATE CASCADE,
  email text,
  telefone text,
  decisor boolean NOT NULL DEFAULT false,
  origem_lead_id uuid REFERENCES public.crm_leads(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX crm_lead_contatos_lead_idx ON public.crm_lead_contatos (lead_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_lead_contatos TO authenticated;
GRANT ALL ON public.crm_lead_contatos TO service_role;
ALTER TABLE public.crm_lead_contatos ENABLE ROW LEVEL SECURITY;
CREATE POLICY crm_lead_contatos_select ON public.crm_lead_contatos FOR SELECT TO authenticated USING (private.has_app_access(auth.uid(), 'crm'));
CREATE POLICY crm_lead_contatos_insert ON public.crm_lead_contatos FOR INSERT TO authenticated WITH CHECK (private.has_app_access(auth.uid(), 'crm'));
CREATE POLICY crm_lead_contatos_update ON public.crm_lead_contatos FOR UPDATE TO authenticated USING (private.has_app_access(auth.uid(), 'crm')) WITH CHECK (private.has_app_access(auth.uid(), 'crm'));
CREATE POLICY crm_lead_contatos_delete ON public.crm_lead_contatos FOR DELETE TO authenticated USING (private.has_app_access(auth.uid(), 'crm'));

CREATE TABLE public.crm_lead_origens (
  lead_id uuid NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  origem text NOT NULL,
  PRIMARY KEY (lead_id, origem)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_lead_origens TO authenticated;
GRANT ALL ON public.crm_lead_origens TO service_role;
ALTER TABLE public.crm_lead_origens ENABLE ROW LEVEL SECURITY;
CREATE POLICY crm_lead_origens_select ON public.crm_lead_origens FOR SELECT TO authenticated USING (private.has_app_access(auth.uid(), 'crm'));
CREATE POLICY crm_lead_origens_insert ON public.crm_lead_origens FOR INSERT TO authenticated WITH CHECK (private.has_app_access(auth.uid(), 'crm'));
CREATE POLICY crm_lead_origens_update ON public.crm_lead_origens FOR UPDATE TO authenticated USING (private.has_app_access(auth.uid(), 'crm')) WITH CHECK (private.has_app_access(auth.uid(), 'crm'));
CREATE POLICY crm_lead_origens_delete ON public.crm_lead_origens FOR DELETE TO authenticated USING (private.has_app_access(auth.uid(), 'crm'));

-- Etapas de lead (configuração; escrita só Admin ERP) --------------------
CREATE TABLE public.crm_etapas_lead (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL UNIQUE,
  nome text NOT NULL,
  ordem int NOT NULL DEFAULT 0,
  cor text,
  tipo text NOT NULL DEFAULT 'aberta' CHECK (tipo IN ('aberta','convertido','descartado')),
  ativa boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER crm_etapas_lead_updated BEFORE UPDATE ON public.crm_etapas_lead FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
GRANT SELECT ON public.crm_etapas_lead TO authenticated;
GRANT ALL ON public.crm_etapas_lead TO service_role;
ALTER TABLE public.crm_etapas_lead ENABLE ROW LEVEL SECURITY;
CREATE POLICY crm_etapas_select ON public.crm_etapas_lead FOR SELECT TO authenticated USING (private.has_app_access(auth.uid(), 'crm'));
CREATE POLICY crm_etapas_admin ON public.crm_etapas_lead FOR ALL TO authenticated USING (private.is_erp_admin(auth.uid())) WITH CHECK (private.is_erp_admin(auth.uid()));

-- Oportunidades ------------------------------------------------------------
CREATE TABLE public.crm_oportunidades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  empresa_id uuid NOT NULL REFERENCES public.crm_empresas(id),
  contato_id uuid REFERENCES public.crm_contatos(id) ON DELETE SET NULL,
  dono_id uuid,
  fase_id uuid NOT NULL REFERENCES public.crm_fases_funil(id),
  fase_desde timestamptz NOT NULL DEFAULT now(),
  valor_setup numeric(14,2),
  valor_mrr numeric(14,2),
  probabilidade int CHECK (probabilidade BETWEEN 0 AND 100),
  data_prevista_fechamento date,
  produto_alvo text CHECK (produto_alvo IN ('MYIO BAS','MYIO Shoppings')),
  motivo_encerramento text,
  proxima_acao_data date,
  proxima_acao_descricao text,
  lead_id uuid REFERENCES public.crm_leads(id) ON DELETE SET NULL,
  observacoes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX crm_oportunidades_dono_idx ON public.crm_oportunidades (dono_id);
CREATE INDEX crm_oportunidades_fase_idx ON public.crm_oportunidades (fase_id);
CREATE INDEX crm_oportunidades_empresa_idx ON public.crm_oportunidades (empresa_id);
CREATE TRIGGER crm_oportunidades_updated BEFORE UPDATE ON public.crm_oportunidades FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_oportunidades TO authenticated;
GRANT ALL ON public.crm_oportunidades TO service_role;
ALTER TABLE public.crm_oportunidades ENABLE ROW LEVEL SECURITY;
CREATE POLICY crm_oportunidades_select ON public.crm_oportunidades FOR SELECT TO authenticated USING (private.has_app_access(auth.uid(), 'crm'));
CREATE POLICY crm_oportunidades_insert ON public.crm_oportunidades FOR INSERT TO authenticated WITH CHECK (private.has_app_access(auth.uid(), 'crm'));
CREATE POLICY crm_oportunidades_update ON public.crm_oportunidades FOR UPDATE TO authenticated USING (private.has_app_access(auth.uid(), 'crm')) WITH CHECK (private.has_app_access(auth.uid(), 'crm'));
CREATE POLICY crm_oportunidades_delete ON public.crm_oportunidades FOR DELETE TO authenticated USING (private.has_app_access(auth.uid(), 'crm'));

ALTER TABLE public.crm_leads ADD CONSTRAINT crm_leads_oportunidade_fk FOREIGN KEY (oportunidade_id) REFERENCES public.crm_oportunidades(id) ON DELETE SET NULL;

-- Atividades (timeline imutável) -------------------------------------------
CREATE TABLE public.crm_atividades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  oportunidade_id uuid REFERENCES public.crm_oportunidades(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('nota','email','whatsapp','ligacao','reuniao','mudanca_de_fase','proposta_gerada','arquivo','sistema')),
  autor_id uuid,
  data timestamptz NOT NULL DEFAULT now(),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (oportunidade_id IS NOT NULL OR lead_id IS NOT NULL)
);
CREATE INDEX crm_atividades_oportunidade_idx ON public.crm_atividades (oportunidade_id, data DESC);
CREATE INDEX crm_atividades_lead_idx ON public.crm_atividades (lead_id, data DESC);
GRANT SELECT, INSERT ON public.crm_atividades TO authenticated;
GRANT ALL ON public.crm_atividades TO service_role;
ALTER TABLE public.crm_atividades ENABLE ROW LEVEL SECURITY;
CREATE POLICY crm_atividades_select ON public.crm_atividades FOR SELECT TO authenticated USING (private.has_app_access(auth.uid(), 'crm'));
CREATE POLICY crm_atividades_insert ON public.crm_atividades FOR INSERT TO authenticated WITH CHECK (private.has_app_access(auth.uid(), 'crm'));

CREATE OR REPLACE FUNCTION public.crm_atividades_imutaveis()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Atividades do CRM são imutáveis (timeline append-only)';
END $$;
CREATE TRIGGER crm_atividades_no_update BEFORE UPDATE ON public.crm_atividades FOR EACH ROW EXECUTE FUNCTION public.crm_atividades_imutaveis();
CREATE TRIGGER crm_atividades_no_delete BEFORE DELETE ON public.crm_atividades FOR EACH ROW EXECUTE FUNCTION public.crm_atividades_imutaveis();

-- Mudança de fase: exige motivo em fase terminal, atualiza fase_desde e registra na timeline
CREATE OR REPLACE FUNCTION public.crm_oportunidade_mudanca_fase()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_de record;
  v_para record;
BEGIN
  IF tg_op = 'UPDATE' AND new.fase_id IS DISTINCT FROM old.fase_id THEN
    SELECT * INTO v_de FROM public.crm_fases_funil WHERE id = old.fase_id;
    SELECT * INTO v_para FROM public.crm_fases_funil WHERE id = new.fase_id;
    IF v_para.tipo IN ('perdido','desqualificado') AND coalesce(trim(new.motivo_encerramento), '') = '' THEN
      RAISE EXCEPTION 'Motivo é obrigatório ao mover para "%"', v_para.nome USING errcode = 'P0001';
    END IF;
    new.fase_desde := now();
    INSERT INTO public.crm_atividades (oportunidade_id, tipo, autor_id, payload)
    VALUES (new.id, 'mudanca_de_fase', auth.uid(),
      jsonb_build_object('de', v_de.nome, 'de_id', v_de.id, 'para', v_para.nome, 'para_id', v_para.id,
                         'motivo', CASE WHEN v_para.tipo IN ('perdido','desqualificado') THEN new.motivo_encerramento ELSE NULL END));
  ELSIF tg_op = 'INSERT' THEN
    SELECT * INTO v_para FROM public.crm_fases_funil WHERE id = new.fase_id;
    INSERT INTO public.crm_atividades (oportunidade_id, tipo, autor_id, payload)
    VALUES (new.id, 'sistema', coalesce(auth.uid(), new.created_by),
      jsonb_build_object('evento', 'criada', 'fase', v_para.nome));
  END IF;
  RETURN new;
END $$;
CREATE TRIGGER crm_oportunidades_fase BEFORE UPDATE ON public.crm_oportunidades FOR EACH ROW EXECUTE FUNCTION public.crm_oportunidade_mudanca_fase();
CREATE TRIGGER crm_oportunidades_criada AFTER INSERT ON public.crm_oportunidades FOR EACH ROW EXECUTE FUNCTION public.crm_oportunidade_mudanca_fase();

-- Municípios IBGE (referência; escrita só Admin ERP) -----------------------
CREATE TABLE public.crm_municipios (
  id int PRIMARY KEY,
  nome text NOT NULL,
  uf char(2) NOT NULL
);
CREATE INDEX crm_municipios_nome_idx ON public.crm_municipios (lower(nome));
GRANT SELECT ON public.crm_municipios TO authenticated;
GRANT ALL ON public.crm_municipios TO service_role;
ALTER TABLE public.crm_municipios ENABLE ROW LEVEL SECURITY;
CREATE POLICY crm_municipios_select ON public.crm_municipios FOR SELECT TO authenticated USING (private.has_app_access(auth.uid(), 'crm'));
CREATE POLICY crm_municipios_admin ON public.crm_municipios FOR ALL TO authenticated USING (private.is_erp_admin(auth.uid())) WITH CHECK (private.is_erp_admin(auth.uid()));