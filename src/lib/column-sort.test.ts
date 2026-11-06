import { describe, expect, it } from "vitest";
import { compareColumnValues } from "./column-sort";

describe("ordenação das solicitações", () => {
  it("ordena destinatários alfabeticamente nos dois sentidos", () => {
    const values = ["Maria", "Alexandre", "João"];
    expect([...values].sort((a, b) => compareColumnValues("text", a, b, "asc"))).toEqual(["Alexandre", "João", "Maria"]);
    expect([...values].sort((a, b) => compareColumnValues("text", a, b, "desc"))).toEqual(["Maria", "João", "Alexandre"]);
  });
  it("ordena previsão e prazo pela data, com vazios no final", () => {
    const values = [null, "2026-12-01", "2026-11-06", "2026-11-03"];
    expect([...values].sort((a, b) => compareColumnValues("date", a, b, "asc"))).toEqual(["2026-11-03", "2026-11-06", "2026-12-01", null]);
    expect([...values].sort((a, b) => compareColumnValues("date", a, b, "desc"))).toEqual(["2026-12-01", "2026-11-06", "2026-11-03", null]);
  });
  it("ordena status pelo nome exibido", () => {
    expect(["Pendente", "Entregue", "Conforme"].sort((a, b) => compareColumnValues("text", a, b, "asc"))).toEqual(["Conforme", "Entregue", "Pendente"]);
  });
  it("ordena valores numericamente e não altera empates", () => {
    expect([100, 2, 10].sort((a, b) => compareColumnValues("number", a, b, "asc"))).toEqual([2, 10, 100]);
    expect(compareColumnValues("text", "João", "Joao", "asc")).toBe(0);
  });
});