import { describe, expect, it } from "vitest";
import { funnelSummary, matchesSearch, needsReason, overdueActions, parseLeadsCsv, pipelineTotals, type Fase, type Oportunidade } from "./crm-logic";

const fases: Fase[] = [
  { id: "a", nome: "Proposta", ordem: 5, tipo: "aberta", cor: null, probabilidade: 50, ativa: true },
  { id: "w", nome: "Aprovado", ordem: 7, tipo: "ganho", cor: null, probabilidade: 100, ativa: true },
  { id: "l", nome: "Perdido", ordem: 8, tipo: "perdido", cor: null, probabilidade: 0, ativa: true },
];
const op = (id: string, fase_id: string, setup: number, mrr: number, extra: Partial<Oportunidade> = {}): Oportunidade => ({ id, titulo: id, empresa_id: "e", fase_id, valor_setup: setup, valor_mrr: mrr, probabilidade: null, data_prevista_fechamento: null, dono_id: null, proxima_acao_data: null, proxima_acao_descricao: null, ...extra });

describe("CRM pipeline", () => {
  it("counts only open phases in the pipeline and weights by the phase probability", () => {
    const t = pipelineTotals(fases, [op("1", "a", 10000, 500), op("2", "w", 20000, 1000), op("3", "l", 5000, 100)]);
    expect(t).toEqual({ openCount: 1, openSetup: 10000, openMrr: 500, weighted: 5000, wonCount: 1, wonMrr: 1000 });
  });
  it("own opportunity probability overrides the phase default", () => {
    expect(funnelSummary(fases, [op("1", "a", 10000, 0, { probabilidade: 80 })])[0].weighted).toBe(8000);
  });
  it("lost and disqualified phases require a reason", () => {
    expect(needsReason(fases[2])).toBe(true);
    expect(needsReason(fases[0])).toBe(false);
  });
  it("overdue next actions ignore closed opportunities", () => {
    const list = overdueActions([op("1", "a", 0, 0, { proxima_acao_data: "2026-11-10" }), op("2", "l", 0, 0, { proxima_acao_data: "2026-11-01" }), op("3", "a", 0, 0, { proxima_acao_data: "2026-12-01" })], fases, "2026-11-17");
    expect(list.map((o) => o.id)).toEqual(["1"]);
  });
});

describe("CRM search and import", () => {
  it("finds a CNPJ typed with or without mask", () => {
    expect(matchesSearch("12345678000190", "Shopping X", "12.345.678/0001-90")).toBe(true);
    expect(matchesSearch("shopping são", "Shopping Sao Paulo")).toBe(true);
  });
  it("imports CSV with ; separator, maps headers and skips rows without Nome", () => {
    const r = parseLeadsCsv("Nome;Empresa;E-mail;Origem\nAna;Shopping A;ana@x.com;Indicação\n;Sem nome;;\n");
    expect(r.error).toBeNull();
    expect(r.rows).toEqual([{ nome: "Ana", empresa_texto: "Shopping A", email: "ana@x.com", origem: "indicacao" }]);
    expect(r.skipped).toBe(1);
  });
  it("rejects a file without the Nome column", () => {
    expect(parseLeadsCsv("Empresa,Email\nA,b").error).toMatch(/Nome/);
  });
});
