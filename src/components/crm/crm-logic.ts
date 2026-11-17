/** Pure CRM rules shared by screens and tests (no database access). */
export type Fase = { id: string; nome: string; ordem: number; tipo: string | null; cor: string | null; probabilidade: number | null; ativa: boolean | null };
export type Oportunidade = { id: string; titulo: string; empresa_id: string; fase_id: string; valor_setup: number | null; valor_mrr: number | null; probabilidade: number | null; data_prevista_fechamento: string | null; dono_id: string | null; proxima_acao_data: string | null; proxima_acao_descricao: string | null };
export type Lead = { id: string; nome: string; status: string | null; origem: string | null; empresa_texto: string | null; email: string | null; telefone: string | null; cnpj: string | null; cargo: string | null };

export const LEAD_ORIGENS = [
  { key: "indicacao", label: "Indicação" }, { key: "site", label: "Site" }, { key: "evento", label: "Evento" },
  { key: "prospeccao", label: "Prospecção ativa" }, { key: "linkedin", label: "LinkedIn" }, { key: "outro", label: "Outro" },
] as const;
export const origemLabel = (k: string | null) => LEAD_ORIGENS.find((o) => o.key === k)?.label ?? (k || "—");

export const brl = (n: number | null | undefined) => (n ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
export const norm = (t: string | null | undefined) => (t ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
/** Every typed term must appear somewhere in the record's text (accents/case ignored; CNPJ/phone masks ignored). */
export function matchesSearch(query: string, ...fields: (string | null | undefined)[]) {
  const terms = norm(query).split(/\s+/).filter(Boolean);
  if (!terms.length) return true;
  const hay = norm(fields.join(" "));
  const digits = hay.replace(/\D/g, "");
  return terms.every((t) => hay.includes(t) || (/^\d[\d./-]*$/.test(t) && digits.includes(t.replace(/\D/g, ""))));
}

/** Probability of an opportunity: its own value, otherwise its phase's default. */
export const probOf = (o: Oportunidade, fase?: Fase) => o.probabilidade ?? fase?.probabilidade ?? 0;
export const isOpen = (f?: Fase) => !f || (f.tipo ?? "aberta") === "aberta";

/** Funnel totals per active phase, in phase order: count, setup, MRR and probability-weighted setup. */
export function funnelSummary(fases: Fase[], ops: Oportunidade[]) {
  return fases.filter((f) => f.ativa !== false).sort((a, b) => a.ordem - b.ordem).map((f) => {
    const list = ops.filter((o) => o.fase_id === f.id);
    const setup = list.reduce((s, o) => s + Number(o.valor_setup ?? 0), 0);
    const mrr = list.reduce((s, o) => s + Number(o.valor_mrr ?? 0), 0);
    const weighted = list.reduce((s, o) => s + Number(o.valor_setup ?? 0) * probOf(o, f) / 100, 0);
    return { fase: f, count: list.length, setup, mrr, weighted };
  });
}

/** Pipeline headline numbers: open opportunities only for pipeline; won phase for "ganho". */
export function pipelineTotals(fases: Fase[], ops: Oportunidade[]) {
  const byId = new Map(fases.map((f) => [f.id, f]));
  const open = ops.filter((o) => isOpen(byId.get(o.fase_id)));
  const won = ops.filter((o) => byId.get(o.fase_id)?.tipo === "ganho");
  return {
    openCount: open.length,
    openSetup: open.reduce((s, o) => s + Number(o.valor_setup ?? 0), 0),
    openMrr: open.reduce((s, o) => s + Number(o.valor_mrr ?? 0), 0),
    weighted: open.reduce((s, o) => s + Number(o.valor_setup ?? 0) * probOf(o, byId.get(o.fase_id)) / 100, 0),
    wonCount: won.length,
    wonMrr: won.reduce((s, o) => s + Number(o.valor_mrr ?? 0), 0),
  };
}

/** Phases that close an opportunity require a reason (mirrors the database trigger). */
export const needsReason = (f?: Fase) => f?.tipo === "perdido" || f?.tipo === "desqualificado";

/** Opportunities whose next action is due today or earlier, earliest first. */
export function overdueActions(ops: Oportunidade[], fases: Fase[], today: string) {
  const byId = new Map(fases.map((f) => [f.id, f]));
  return ops.filter((o) => o.proxima_acao_data && o.proxima_acao_data <= today && isOpen(byId.get(o.fase_id))).sort((a, b) => (a.proxima_acao_data! < b.proxima_acao_data! ? -1 : 1));
}

const HEADER_ALIASES: Record<string, string> = { nome: "nome", name: "nome", empresa: "empresa_texto", company: "empresa_texto", cargo: "cargo", email: "email", "e-mail": "email", telefone: "telefone", celular: "telefone", phone: "telefone", cnpj: "cnpj", origem: "origem", observacoes: "observacoes", observacao: "observacoes" };
function splitCsvLine(line: string, sep: string) {
  const out: string[] = []; let cur = ""; let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') { if (q && line[i + 1] === '"') { cur += '"'; i++; } else q = !q; }
    else if (c === sep && !q) { out.push(cur); cur = ""; } else cur += c;
  }
  out.push(cur); return out.map((s) => s.trim());
}
/** Lead CSV import: header row required (Nome mandatory), ; or , separator, unknown columns ignored, rows without Nome skipped. */
export function parseLeadsCsv(text: string) {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return { rows: [] as Record<string, string>[], skipped: 0, error: "Arquivo vazio." };
  const sep = (lines[0].match(/;/g)?.length ?? 0) >= (lines[0].match(/,/g)?.length ?? 0) ? ";" : ",";
  const headers = splitCsvLine(lines[0], sep).map((h) => HEADER_ALIASES[norm(h).replace(/\s+/g, "")] ?? null);
  if (!headers.includes("nome")) return { rows: [], skipped: 0, error: "A primeira linha precisa ter a coluna Nome." };
  let skipped = 0;
  const rows = lines.slice(1).flatMap((l) => {
    const cells = splitCsvLine(l, sep); const r: Record<string, string> = {};
    headers.forEach((h, i) => { if (h && cells[i]) r[h] = cells[i]; });
    if (!r.nome) { skipped++; return []; }
    if (r.origem) { const o = LEAD_ORIGENS.find((x) => norm(x.label) === norm(r.origem) || x.key === norm(r.origem)); r.origem = o?.key ?? "outro"; }
    return [r];
  });
  return { rows, skipped, error: null as string | null };
}
