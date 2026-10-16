import { describe, test } from "node:test";
import { strict as assert } from "node:assert";
const expect = (actual: unknown) => ({ toEqual: (expected: unknown) => assert.deepEqual(actual, expected), toBe: (expected: unknown) => assert.equal(actual, expected), toHaveLength: (length: number) => assert.equal((actual as unknown[]).length, length) });
import { groupMeterElectricalReportRows, meterElectricalItemsForPoint, validCatalogQuantity } from "./site-survey-meter-electrical";
const questions = [{ id: "nearby", section_id: "water", prompt: "Existe ponto de elétrica próximo ao hidrômetro?" }];
const items = [
  { id: "canaleta", name: "Canaleta", quantity: 2, unit: "m", active: true },
  { id: "cabo", name: "Cabo PP", quantity: 2, unit: "m", active: true },
  { id: "rabicho", name: "Rabicho fêmea", quantity: 1, unit: "un", active: true },
];
const materials = (answer: unknown, skips: string[] = [], status = "concluida", catalog = items) => meterElectricalItemsForPoint([{ question_id: "nearby", answer }], questions, skips, status, catalog);
describe("Materiais elétricos para compras", () => {
  test("agrupa itens elétricos mantendo totais individuais e uma relação única de lojas, inclusive com dez itens", () => {
    const rows = items.map((item) => ({ key: `meter-electrical:${item.id}`, label: item.name, quantity: item.quantity * 75, unit: item.unit, points: ["LUC 71 — Habib's", "LUC 74 — Vivendas do camarão"] }));
    const meter = { key: "meter:1", label: "Hidrômetro DN25", quantity: 1, points: ["LUC 56 — Cine Taboão"] };
    const group = groupMeterElectricalReportRows([meter, ...rows]);
    expect(group.items.map((item) => [item.label, item.quantity, item.unit])).toEqual([["Canaleta", 150, "m"], ["Cabo PP", 150, "m"], ["Rabicho fêmea", 75, "un"]]);
    expect(group.points).toEqual(["LUC 71 — Habib's", "LUC 74 — Vivendas do camarão"]);
    expect(group.otherRows).toEqual([meter]);
    const tenItems = Array.from({ length: 10 }, (_, index) => ({ ...rows[0], key: `meter-electrical:${index}` }));
    expect(groupMeterElectricalReportRows(tenItems).items).toHaveLength(10);
    expect(groupMeterElectricalReportRows(tenItems).points).toHaveLength(2);
  });
  test("Sim gera 2 m canaleta, 2 m cabo PP e 1 rabicho por ponto", () => {
    expect(materials({ value: "Sim", detail: "Tomada" }).map(({ quantity, unit }) => [quantity, unit])).toEqual([[2, "m"], [2, "m"], [1, "un"]]);
  });
  test("Não ou não informado não gera materiais", () => {
    for (const answer of ["Não", "Não informado", "", { value: "Não", observation: "Sim" }]) expect(materials(answer)).toEqual([]);
  });
  test("duas respostas Sim no mesmo ponto não duplicam o kit", () => {
    expect(meterElectricalItemsForPoint([{ question_id: "nearby", answer: "Sim" }, { question_id: "nearby", answer: "Sim" }], questions, [], "concluida", items)).toHaveLength(3);
  });
  test("três pontos totalizam 6 m, 6 m e 3 un", () => {
    const totals = [materials("Sim"), materials("Sim"), materials("Sim"), materials("Não")].flat().reduce<Record<string, number>>((result, item) => ({ ...result, [item.id]: (result[item.id] ?? 0) + item.quantity }), {});
    expect(totals).toEqual({ canaleta: 6, cabo: 6, rabicho: 3 });
  });
  test("usa a quantidade editada no cadastro", () => {
    expect(materials("Sim", [], "concluida", [{ ...items[0], quantity: 3.5 }])[0]?.quantity).toBe(3.5);
  });
  test("exclui cancelados, etapas não aplicáveis e itens inativos", () => {
    expect(materials("Sim", ["water"])).toEqual([]);
    expect(materials("Sim", [], "cancelada")).toEqual([]);
    expect(materials("Sim", [], "concluida", [{ ...items[0], active: false }])).toEqual([]);
  });
  test("quantidade deve ser positiva e com unidade válida", () => {
    expect(validCatalogQuantity(2, "m")).toBe(true);
    expect(validCatalogQuantity(1, "un")).toBe(true);
    for (const value of [0, -1, NaN, Infinity]) expect(validCatalogQuantity(value, "m")).toBe(false);
    expect(validCatalogQuantity(2, "invalid")).toBe(false);
  });
});
