import { describe, expect, it } from "vitest";
import { matchesColumnFilter, parseNumber } from "./column-filters";

describe("filtros de coluna estilo Excel", () => {
  it("texto: contém e diferente de, ignorando acentos", () => {
    expect(matchesColumnFilter("text", "São Paulo", "São Paulo", { op: "contains", value: "sao" })).toBe(true);
    expect(matchesColumnFilter("text", "João", "João", { op: "not_equals", value: "joao" })).toBe(false);
    expect(matchesColumnFilter("text", "Maria", "Maria", { op: "not_equals", value: "joao" })).toBe(true);
  });
  it("número: maior que / menor que / entre", () => {
    expect(matchesColumnFilter("number", 1500, "", { op: "gt", value: "1.000,00" })).toBe(true);
    expect(matchesColumnFilter("number", 500, "", { op: "gt", value: "1000" })).toBe(false);
    expect(matchesColumnFilter("number", 500, "", { op: "lt", value: "1000" })).toBe(true);
    expect(matchesColumnFilter("number", 500, "", { op: "between", value: "100", value2: "600" })).toBe(true);
    expect(parseNumber("R$ 10.500,25")).toBe(10500.25);
  });
  it("data: antes de / depois de", () => {
    expect(matchesColumnFilter("date", "2026-11-03", "", { op: "before", value: "2026-11-05" })).toBe(true);
    expect(matchesColumnFilter("date", "2026-11-06", "", { op: "before", value: "2026-11-05" })).toBe(false);
    expect(matchesColumnFilter("date", "2026-11-06", "", { op: "after", value: "2026-11-05" })).toBe(true);
    expect(matchesColumnFilter("date", null, "", { op: "after", value: "2026-11-05" })).toBe(false);
  });
  it("lista de valores marcados", () => {
    expect(matchesColumnFilter("text", "Materiais", "Materiais", { selected: ["Serviços"] })).toBe(false);
    expect(matchesColumnFilter("text", "", "", { selected: ["(Vazias)"] })).toBe(true);
  });
  it("combina vários filtros sem substituir a escolha anterior", () => {
    const rows = [{ id: "1", status: "Em atendimento", app: "Supply" }, { id: "2", status: "Atendido", app: "Supply" }, { id: "3", status: "Em atendimento", app: "Legal" }];
    const filtered = rows.filter(row => matchesColumnFilter("text", row.status, row.status, { selected: ["Em atendimento"] }) && matchesColumnFilter("text", row.app, row.app, { selected: ["Supply"] }));
    expect(filtered.map(row => row.id)).toEqual(["1"]);
  });
  it("retira apenas o filtro escolhido e preserva os demais", () => {
    const rows = [{ id: "1", status: "Em atendimento", app: "Supply" }, { id: "2", status: "Atendido", app: "Supply" }, { id: "3", status: "Em atendimento", app: "Legal" }];
    const filtered = rows.filter(row => matchesColumnFilter("text", row.status, row.status, undefined) && matchesColumnFilter("text", row.app, row.app, { selected: ["Supply"] }));
    expect(filtered.map(row => row.id)).toEqual(["1", "2"]);
  });
});
