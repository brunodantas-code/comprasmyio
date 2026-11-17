import { custoCapitalizavel, type ItemInstalacao } from "./motor-custeio";

export type Lote = { id: string; codigo: string; descricao: string | null; status: "exemplo" | "validado" | "encerrado"; vigencia_inicio: string; vigencia_fim: string | null };
export type CustoBase = { id?: string; lote_id: string; produto: Produto; componentes_myio: number; mod_assembling: number; cif: number; pre_setup_fabrica: number };
export type Produto = "3F" | "SWITCH" | "REMOTE" | "CENTRAL";
export const PRODUTOS: Produto[] = ["3F", "SWITCH", "REMOTE", "CENTRAL"];
export const GRUPOS_KIT = ["Telemetria de Energia", "Telemetria de Vazão de Água", "Telemetria de Nível de Água", "Telemetria de Temperatura", "Atuação Remota IR", "Central de Automação"];
export type Kit = { id: string; nome: string; grupo: string; produto: Produto; custo_3os_imp: number; custo_3os_nac: number; ativo: boolean };
export type ItemTabela = { id: string; categoria: string; nome: string; modelo: string | null; unidade: string; preco_setup: number; preco_mensal: number; ativo: boolean };
export type CustoItem = { item_id: string; kit_id: string | null; custo_manual: number | null; markup_percentual: number };

/** Current batch: valid on the date, not closed; validated wins over example, then the most recent start. */
export function loteVigente(lotes: Lote[], hoje = new Date().toISOString().slice(0, 10)): Lote | null {
  return [...lotes].filter((l) => l.status !== "encerrado" && l.vigencia_inicio <= hoje && (!l.vigencia_fim || l.vigencia_fim >= hoje))
    .sort((a, b) => Number(b.status === "validado") - Number(a.status === "validado") || b.vigencia_inicio.localeCompare(a.vigencia_inicio))[0] ?? null;
}
/** Capitalizable kit cost = product base cost in the current batch + third-party parts; null when the batch has no base cost for the product. */
export function custoKit(kit: Kit, bases: CustoBase[], lote: Lote | null): number | null {
  const b = lote ? bases.find((x) => x.lote_id === lote.id && x.produto === kit.produto) : undefined;
  return b ? custoCapitalizavel(b, kit) : null;
}
/** Effective item cost: linked kit cost wins over the manual cost. */
export function custoEfetivo(c: CustoItem | undefined, kits: Kit[], bases: CustoBase[], lote: Lote | null): { valor: number | null; fonte: "kit" | "manual" | null } {
  const kit = c?.kit_id ? kits.find((k) => k.id === c.kit_id) : undefined;
  const k = kit ? custoKit(kit, bases, lote) : null;
  if (k !== null) return { valor: k, fonte: "kit" };
  if (c?.custo_manual != null) return { valor: Number(c.custo_manual), fonte: "manual" };
  return { valor: null, fonte: null };
}
/** Suggested setup price = cost × (1 + markup%). */
export const precoSugerido = (custo: number | null, markup: number) => (custo === null ? null : Math.round(custo * (1 + markup / 100) * 100) / 100);

/** Proposal items → cost-engine inputs: items linked to the price list carry their kit product and capitalizable cost. */
export function itensParaMotor(itens: { nome: string; quantidade: number; categoria: string; tabela_item_id?: string | null }[], custos: CustoItem[], kits: Kit[], bases: CustoBase[], lote: Lote | null): ItemInstalacao[] {
  return itens.filter((i) => i.categoria !== "mao_de_obra").map((i) => {
    const c = i.tabela_item_id ? custos.find((x) => x.item_id === i.tabela_item_id) : undefined;
    const kit = c?.kit_id ? kits.find((k) => k.id === c.kit_id) : undefined;
    return { nome: i.nome, quantidade: Number(i.quantidade) || 0, custo_capitalizavel_unit: custoEfetivo(c, kits, bases, lote).valor, produto: kit?.produto ?? null };
  });
}
