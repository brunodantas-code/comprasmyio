import { expect, it } from "vitest";
import type { MytosisNode } from "./mytosis";
import { linkedFlowReferences, visibleLinkedFlows } from "./mytosis-linked-flows";

const nodes = [
  { id: "1", parent_id: null, is_process: true },
  { id: "1.end", parent_id: "1", is_process: true, linked_node_id: "5" },
  { id: "5", parent_id: null, is_process: true, title: "Implantação" },
  { id: "5.end", parent_id: "5", is_process: true, linked_node_id: "6.start" },
  { id: "6", parent_id: null, is_process: true },
  { id: "6.start", parent_id: "6", is_process: true, linked_node_id: "1" },
] as MytosisNode[];
const refs = linkedFlowReferences(nodes);

it("um fluxo individual não exibe vínculos recolhidos", () => {
  expect(visibleLinkedFlows("1", refs, new Set())).toEqual(["1"]);
});
it("abrir o fim do fluxo 1 exibe o fluxo 5 na sequência", () => {
  expect(visibleLinkedFlows("1", refs, new Set(["1.end"]))).toEqual(["1", "5"]);
});
it("Exibir tudo abre vínculos transitivos sem repetir fluxos em ciclos", () => {
  expect(visibleLinkedFlows("1", refs, new Set(refs.map((ref) => ref.nodeId)))).toEqual(["1", "5", "6"]);
});
it("recolher o primeiro vínculo oculta também seus fluxos seguintes", () => {
  expect(visibleLinkedFlows("1", refs, new Set(["5.end", "6.start"]))).toEqual(["1"]);
});
it("vínculo em uma etapa resolve o fluxograma de destino", () => {
  expect(refs.find((ref) => ref.nodeId === "5.end")?.targetId).toBe("6");
});