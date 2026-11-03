import { describe, expect, it } from "vitest";
import { computePhases, computeProgress, criticalPath, groupPendings, type MytosisNode } from "./mytosis";

const n = (id: string, parent: string | null, extra: Partial<MytosisNode> = {}): MytosisNode => ({
  id, locator: 1, kind: parent ? "task" : "objective", title: id, description: null, parent_id: parent,
  responsible_id: null, due_date: null, weight: 0, progress: 0, position: 0, created_at: "", ...extra,
});

describe("Mytosis", () => {
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
