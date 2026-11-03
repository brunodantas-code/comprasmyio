import { describe, expect, it } from "vitest";
import { computeBoxNumbers, computePhases, computeProgress, criticalPath, groupPendings, planBlockImport as _plan, type MytosisNode } from "./mytosis";

const n = (id: string, parent: string | null, extra: Partial<MytosisNode> = {}): MytosisNode => ({
  id, locator: 1, kind: parent ? "task" : "objective", title: id, description: null, parent_id: parent,
  responsible_id: null, due_date: null, weight: 0, progress: 0, position: 0, created_at: "", ...extra,
});

describe("Mytosis", () => {
  it("Site Survey é o fluxograma 2, independentemente do localizador armazenado", () => {
    const nodes = [n("captacao", null, { locator: 1, is_process: true }), n("survey", null, { locator: 8, is_process: true })];
    expect(computeBoxNumbers(nodes, []).get("survey")).toBe("2");
  });
  it("recalcula localizadores após excluir uma etapa sem alterar os vínculos ou IDs armazenados", () => {
    const root = n("root", null, { locator: 10 });
    const a = n("a", "root", { locator: 30 });
    const removed = n("removed", "root", { locator: 40 });
    const b = n("b", "root", { locator: 90 });
    const links = [{ predecessor_id: "a", successor_id: "b" }];
    expect(computeBoxNumbers([root, a, removed, b], links).get("b")).toBe("1.2.4");
    expect(computeBoxNumbers([root, a, b], links).get("b")).toBe("1.2.3");
    expect(b.locator).toBe(90);
    expect(links).toEqual([{ predecessor_id: "a", successor_id: "b" }]);
  });
  it("box 3 mostra a sequência 1.2.3, usando o predecessor horizontal", () => {
    const nodes = [n("root", null, { locator: 1 }), n("contact", "root", { locator: 2 }), n("email", "root", { locator: 3 })];
    const numbers = computeBoxNumbers(nodes, [{ predecessor_id: "contact", successor_id: "email" }]);
    expect(numbers.get("root")).toBe("1");
    expect(numbers.get("contact")).toBe("1.2");
    expect(numbers.get("email")).toBe("1.2.3");
  });

  it("mantém uma sequência única no encontro de caminhos e em etapas verticais", () => {
    const nodes = [n("root", null, { locator: 1 }), n("a", "root", { locator: 2 }), n("b", "root", { locator: 3 }), n("c", "root", { locator: 4 }), n("child", "c", { locator: 5 })];
    const links = [{ predecessor_id: "b", successor_id: "c" }, { predecessor_id: "a", successor_id: "c" }];
    expect(computeBoxNumbers(nodes, links).get("c")).toBe("1.2.4");
    expect(computeBoxNumbers(nodes, links).get("child")).toBe("1.2.4.5");
    expect(computeBoxNumbers(nodes, links.slice(0, 1)).get("c")).toBe("1.3.4");
  });

  it("objetivo soma as tarefas pelo peso informado", () => {
    const nodes = [n("o", null), n("a", "o", { weight: 70, progress: 100 }), n("b", "o", { weight: 30, progress: 0 })];
    expect(computeProgress(nodes).get("o")).toBe(70);
  });

  it("sem pesos, tarefas pesam igual", () => {
    const nodes = [n("o", null), n("a", "o", { progress: 100 }), n("b", "o", { progress: 0 })];
    expect(computeProgress(nodes).get("o")).toBe(50);
  });

  it("dependente fica uma fase à direita do predecessor", () => {
    const nodes = [n("o", null), n("a", "o"), n("b", "o"), n("c", "o")];
    const { phase, last } = computePhases("o", nodes, [{ predecessor_id: "a", successor_id: "b" }, { predecessor_id: "b", successor_id: "c" }]);
    expect(phase.get("c")).toBe(2);
    expect(last).toBe(2);
  });

  it("caminho crítico marca só as pendentes", () => {
    const nodes = [n("o", null), n("a", "o", { progress: 100 }), n("b", "o", { progress: 40 })];
    expect([...criticalPath("o", nodes, [])].sort()).toEqual(["b", "o"]);
  });

  it("relatório agrupa pendências por responsável", () => {
    const nodes = [n("o", null), n("a", "o", { responsible_id: "u1" }), n("b", "o", { responsible_id: "u1", progress: 100 }), n("c", "o")];
    const groups = groupPendings(nodes, "responsible", () => "Ana");
    expect(groups.map((g) => [g.label, g.items.length])).toEqual([["Ana", 1], ["Sem responsável", 1]]);
  });
});


it("importar bloco copia pais antes dos filhos e só ligações internas", () => {
  const mk = (id: string, parent: string | null, locator: number) => ({ id, locator, kind: "task" as const, title: id, description: null, parent_id: parent, responsible_id: null, due_date: null, weight: 0, progress: 0, position: 0, created_at: "" });
  const nodes = [mk("c", "a", 3), mk("a", null, 1), mk("b", "a", 2), mk("x", null, 9)];
  const links = [{ predecessor_id: "b", successor_id: "c" }, { predecessor_id: "c", successor_id: "x" }];
  const r = _plan("a", nodes, links);
  expect(r.ordered[0].id).toBe("a");
  expect(r.ordered.map((n) => n.id).sort()).toEqual(["a", "b", "c"]);
  expect(r.internalLinks).toEqual([{ predecessor_id: "b", successor_id: "c" }]);
});
