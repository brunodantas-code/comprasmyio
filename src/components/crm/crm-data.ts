import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Fase, Lead, Oportunidade } from "./crm-logic";

export type Empresa = { id: string; nome_fantasia: string; razao_social: string | null; cnpj: string | null; segmento: string | null; cidade: string | null; uf: string | null; grupo_economico: string | null; observacoes: string | null };
export type Contato = { id: string; empresa_id: string; nome: string; cargo: string | null; email: string | null; telefone: string | null; observacoes: string | null; papel: string | null };
export type Etapa = { id: string; codigo: string; nome: string; ordem: number | null; cor: string | null; ativa: boolean | null };
export type FullLead = Lead & { etapa_codigo: string | null; papel: string | null; observacoes: string | null; dono_id: string | null; empresa_id: string | null; oportunidade_id: string | null; created_at: string };
export type FullOp = Oportunidade & { contato_id: string | null; produto_alvo: string | null; motivo_encerramento: string | null; observacoes: string | null; lead_id: string | null; fase_desde: string | null; created_at: string };

export type CrmData = { empresas: Empresa[]; contatos: Contato[]; leads: FullLead[]; fases: Fase[]; etapas: Etapa[]; ops: FullOp[]; users: { id: string; full_name: string | null }[] };

/** All CRM data visible to the user (RLS: app access 'crm'). */
export const crmOptions = () => queryOptions({
  queryKey: ["crm"],
  queryFn: async (): Promise<CrmData> => {
    const [empresas, contatos, leads, fases, etapas, ops, users] = await Promise.all([
      supabase.from("crm_empresas").select("*").order("nome_fantasia"),
      supabase.from("crm_contatos").select("*").order("nome"),
      supabase.from("crm_leads").select("*").order("created_at", { ascending: false }),
      supabase.from("crm_fases_funil").select("*").order("ordem"),
      supabase.from("crm_etapas_lead").select("*").order("ordem"),
      supabase.from("crm_oportunidades").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("id, full_name").order("full_name"),
    ]);
    for (const r of [empresas, contatos, leads, fases, etapas, ops]) if (r.error) throw r.error;
    return {
      empresas: (empresas.data ?? []) as Empresa[], contatos: (contatos.data ?? []) as Contato[], leads: (leads.data ?? []) as unknown as FullLead[],
      fases: (fases.data ?? []) as unknown as Fase[], etapas: (etapas.data ?? []) as Etapa[], ops: (ops.data ?? []) as unknown as FullOp[],
      users: ((users.data ?? []) as { id: string; full_name: string | null }[]),
    };
  },
});
