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
  it("consolida Projects mantendo sua posição e as demais categorias", () => {
    const result = mergeCdeOrder(JSON.stringify({ cats: ["alerts", "project_budget", "project_appearance", "spend"], titles: { spend: "Despesas" } }), { cats: ["alerts", "project_budget", "spend"], subs: {} });
    expect(result.cats).toEqual(["alerts", "project_budget", "spend"]);
    expect(result.titles).toEqual({ spend: "Despesas" });
  });
  it("consolida Filtros e Ordenação em Botões de ação sem perder a ordem nem os nomes salvos", () => {
    const defaults = { cats: ["app_appearance", "p:1", "p:4", "p:5"], subs: { "4": ["save", "cancel", "filter", "p:3"], "3": ["sort", "move", "summary", "toggle"] } };
    const saved = { cats: ["app_appearance", "p:1", "filter", "p:3", "p:4", "p:5"], subs: { "4": ["cancel", "save"], "3": ["toggle", "summary", "move", "sort"] }, titles: { filter: "Meus filtros", "p:3": "Minha ordenação", "p:4": "Minhas ações" } };
    const result = mergeCdeOrder(JSON.stringify(saved), defaults);
    expect(result.cats).toEqual(["app_appearance", "p:1", "p:4", "p:5"]);
    expect(result.subs["4"]).toEqual(["cancel", "save", "filter", "p:3"]);
    expect(result.subs["3"]).toEqual(["toggle", "summary", "move", "sort"]);
    expect(result.titles).toEqual(saved.titles);
  });
  it("move a edição de cores para Aparência preservando o nome salvo e as outras categorias", () => {
    const defaults = { cats: ["app_appearance", "p:4", "apps"], subs: { app_appearance: ["color_swatch"] } };
    const result = mergeCdeOrder(JSON.stringify({ cats: ["app_appearance", "p:4", "color_swatch", "apps"], titles: { color_swatch: "Amostras de cores" } }), defaults);
    expect(result.cats).toEqual(["app_appearance", "p:4", "apps"]);
    expect(result.subs["app_appearance"]).toEqual(["color_swatch"]);
    expect(result.titles).toEqual({ color_swatch: "Amostras de cores" });
  });
  it("move Customizações do Projects para Aparência sem perder nomes nem duplicar a categoria", () => {
    const defaults = { cats: ["app_appearance", "apps"], subs: { app_appearance: ["color_swatch", "project_budget"] } };
    const result = mergeCdeOrder(JSON.stringify({ cats: ["app_appearance", "apps", "project_budget"], titles: { project_budget: "Ajustes do Projects" } }), defaults);
    expect(result.cats).toEqual(["app_appearance", "apps"]);
    expect(result.subs["app_appearance"]).toEqual(["color_swatch", "project_budget"]);
    expect(result.titles).toEqual({ project_budget: "Ajustes do Projects" });
  });
});