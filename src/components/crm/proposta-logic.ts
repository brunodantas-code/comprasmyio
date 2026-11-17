/** Pure rules for CRM proposals (Fase 3). */
export type PropostaStatus = "rascunho" | "enviada" | "aceita" | "recusada";
export const STATUS_PROPOSTA: { value: PropostaStatus; label: string }[] = [
  { value: "rascunho", label: "Rascunho" }, { value: "enviada", label: "Enviada" }, { value: "aceita", label: "Aceita" }, { value: "recusada", label: "Recusada" },
];
export const statusLabel = (s: string) => STATUS_PROPOSTA.find((o) => o.value === s)?.label ?? s;

export const CATEGORIAS_ITEM = [
  { value: "produto_myio", label: "Produto myio" }, { value: "produto_terceiro", label: "Produto de terceiro" },
  { value: "insumo", label: "Insumo" }, { value: "mao_de_obra", label: "Mão de obra" },
] as const;

export type Condicoes = { contrato_meses: number; parcelas_setup: number; validade_dias: number; observacoes?: string | null; contrato_referencia?: string | null };
export type ItemProposta = { id?: string; categoria: string; nome: string; modelo: string | null; unidade: string; quantidade: number; preco_setup_unit: number; preco_mensal_unit: number; ambiente: string | null; observacao: string | null; tabela_item_id?: string | null };
export type Pendencia = { id: string; texto: string; status: "aberta" | "resolvida" | "nao_se_aplica"; resolucao: string | null };

const r2 = (n: number) => Math.round(n * 100) / 100;
export function totaisDe(itens: Pick<ItemProposta, "quantidade" | "preco_setup_unit" | "preco_mensal_unit">[]) {
  return {
    setup: r2(itens.reduce((s, i) => s + (Number(i.quantidade) || 0) * (Number(i.preco_setup_unit) || 0), 0)),
    mensal: r2(itens.reduce((s, i) => s + (Number(i.quantidade) || 0) * (Number(i.preco_mensal_unit) || 0), 0)),
  };
}

export function parseCondicoes(raw: unknown): Condicoes {
  const p = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const int = (v: unknown, d: number, min = 1) => { const n = Math.round(Number(v)); return Number.isFinite(n) && n >= min ? n : d; };
  return {
    contrato_meses: int(p.contrato_meses, 36), parcelas_setup: int(p.parcelas_setup, 3), validade_dias: int(p.validade_dias, 30),
    observacoes: typeof p.observacoes === "string" && p.observacoes.trim() ? p.observacoes : null,
    contrato_referencia: typeof p.contrato_referencia === "string" && p.contrato_referencia.trim() ? p.contrato_referencia : null,
  };
}

/** {{chave}} → valor; unknown keys become empty. */
export const renderTemplate = (text: string | null | undefined, vars: Record<string, string | null | undefined>) =>
  (text ?? "").replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k: string) => vars[k] ?? "").replace(/\s{2,}/g, " ").trim();

export function parcelasTexto(totalSetup: number, parcelas: number, fmt: (n: number) => string) {
  const n = Math.max(1, Math.round(parcelas) || 1);
  return n > 1 ? `${n} parcelas de ${fmt(r2(totalSetup / n))}` : "parcela única";
}

/** Why the proposal cannot leave draft / generate its document; null = allowed. */
export function bloqueioEnvio(itens: ItemProposta[], pendencias: Pendencia[]): string | null {
  const abertas = pendencias.filter((p) => p.status === "aberta").length;
  if (abertas) return `Resolva ${abertas === 1 ? "a pendência aberta" : `as ${abertas} pendências abertas`} antes.`;
  if (!itens.length) return "Inclua ao menos um item.";
  const sem = itens.find((i) => !i.nome.trim());
  if (sem) return "Todos os itens precisam de nome.";
  return null;
}

export const proximaVersao = (versoes: number[]) => (versoes.length ? Math.max(...versoes) : 0) + 1;
