import { expect, it } from "vitest";
import { initialNodeShape, nodeFlowLink, processEntryNodes, requiresNodeResponsible } from "./mytosis-editor";

it("qualquer etapa de fluxograma pode salvar vínculo, independentemente da forma", () => {
  expect(nodeFlowLink(true, true, "outra-etapa")).toBe("outra-etapa");
  expect(nodeFlowLink(true, false, "outra-etapa")).toBeNull();
  expect(nodeFlowLink(false, true, "outra-etapa")).toBeNull();
});

it("etapas de Fluxograma não exigem Responsável", () => {
  expect(requiresNodeResponsible(true)).toBe(false);
});

it("OKRs mantêm Responsável obrigatório", () => {
  expect(requiresNodeResponsible(false)).toBe(true);
});

it("novo Fluxograma começa em Início/fim mesmo se o padrão for Processo", () => {
  expect(initialNodeShape(true, null, null, "process")).toBe("terminal");
});

it("novas etapas usam o padrão salvo", () => {
  expect(initialNodeShape(true, "root", null, "decision")).toBe("decision");
});

it("editar um box existente preserva sua forma", () => {
  expect(initialNodeShape(true, null, "process", "terminal")).toBe("process");
});

it("desenho começa em 4.1 sem box de título, com 4.2 conectada à direita", () => {
  const nodes = [{ id: "4", parent_id: null }, { id: "4.1", parent_id: "4" }, { id: "4.2", parent_id: "4" }];
  expect(processEntryNodes("4", nodes, [{ predecessor_id: "4", successor_id: "4.1" }, { predecessor_id: "4.1", successor_id: "4.2" }]).map((n) => n.id)).toEqual(["4.1"]);
});