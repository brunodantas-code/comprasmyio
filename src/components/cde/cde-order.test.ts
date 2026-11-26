import { describe, expect, it } from "vitest";
import { mergeCdeOrder } from "./cde-order";

describe("ordem das subcategorias de numeração", () => {
  const defaults = { cats: ["p:6"], subs: { "6": ["number_section", "number_subsection", "record_number"] } };
  it("inclui números de chamados após os modelos existentes", () => {
    const saved = JSON.stringify({ cats: ["p:6"], subs: { "6": ["number_subsection", "number_section"] } });
    expect(mergeCdeOrder(saved, defaults).subs["6"]).toEqual(["number_subsection", "number_section", "record_number"]);
  });
  it("preserva a posição escolhida para números de chamados", () => {
    const saved = JSON.stringify({ cats: ["p:6"], subs: { "6": ["record_number", "number_section", "number_subsection"] } });
    expect(mergeCdeOrder(saved, defaults).subs["6"]).toEqual(["record_number", "number_section", "number_subsection"]);
  });
  it("preserva nomes por identidade após reordenar categorias", () => {
    const config = { cats: ["a", "b"], subs: {} };
    const result = mergeCdeOrder(JSON.stringify({ cats: ["b", "a"], titles: { a: "Nome editado", b: "Outro item" } }), config);
    expect(result.cats).toEqual(["b", "a"]);
    expect(result.titles).toEqual({ a: "Nome editado", b: "Outro item" });
  });
  it("ignora nomes vazios e identidades removidas sem perder os itens", () => {
    const result = mergeCdeOrder(JSON.stringify({ titles: { a: "  ", b: " Nome válido ", removed: "Antigo" } }), { cats: ["a", "b"], subs: {} });
    expect(result.titles).toEqual({ b: "Nome válido" });
    expect(result.cats).toEqual(["a", "b"]);
  });
});