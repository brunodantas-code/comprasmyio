import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { cnpjDigits, UFS } from "./config-logic";

async function json(url: string): Promise<unknown> {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(4000), headers: { Accept: "application/json" } });
    if (!r.ok) { console.error("CRM consulta pública", r.status, await r.text()); return null; }
    return await r.json();
  } catch { return null; }
}
const text = (v: unknown) => typeof v === "string" ? v.trim() : "";
export const lookupCnpj = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input: { cnpj: string }) => ({ cnpj: cnpjDigits(input.cnpj) }))
  .handler(async ({ data, context }) => {
    const access = await context.supabase.from("user_app_access").select("app_key").eq("user_id", context.userId).eq("app_key", "crm").maybeSingle();
    if (access.error || !access.data) throw new Error("Sem acesso ao CRM.");
    const result = await json(`https://brasilapi.com.br/api/cnpj/v1/${data.cnpj}`);
    if (result && typeof result === "object" && "razao_social" in result) {
      const r = result as Record<string, unknown>;
      return { values: { cnpj: data.cnpj, razao_social: text(r.razao_social), nome_fantasia: text(r.nome_fantasia) || text(r.razao_social), cidade: text(r.municipio), uf: text(r.uf) }, error: null };
    }
    const reserve = await json(`https://receitaws.com.br/v1/cnpj/${data.cnpj}`);
    if (reserve && typeof reserve === "object" && "nome" in reserve) {
      const r = reserve as Record<string, unknown>;
      return { values: { cnpj: data.cnpj, razao_social: text(r.nome), nome_fantasia: text(r.fantasia) || text(r.nome), cidade: text(r.municipio), uf: text(r.uf) }, error: null };
    }
    return { values: null, error: "CNPJ não encontrado ou consulta indisponível. O cadastro manual continua disponível." };
  });
export const lookupMunicipios = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input: { uf: string }) => { const uf = input.uf.toUpperCase(); if (!UFS.includes(uf)) throw new Error("Selecione uma UF válida."); return { uf }; })
  .handler(async ({ data, context }) => {
    const access = await context.supabase.from("user_app_access").select("app_key").eq("user_id", context.userId).eq("app_key", "crm").maybeSingle();
    if (access.error || !access.data) throw new Error("Sem acesso ao CRM.");
    const rows = await json(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${data.uf}/municipios?orderBy=nome`);
    if (!Array.isArray(rows)) return { rows: [] as { id: number; nome: string }[], error: "Consulta do IBGE indisponível. Informe a cidade manualmente." };
    return { rows: rows.filter((r) => r && typeof r.id === "number" && typeof r.nome === "string").map((r) => ({ id: r.id as number, nome: r.nome as string })), error: null };
  });