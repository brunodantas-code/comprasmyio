import { describe, expect, test } from "vitest";
import { environmentDisciplineTotals } from "./site-survey-environment-totals";

const types = [
  { id: "t-transformadores", discipline: "electrical" },
  { id: "t-elevadores", discipline: "electrical" },
  { id: "t-hidrometros-lojas", discipline: "hydraulic" },
  { id: "t-reservatorios", discipline: "hydraulic" },
];

describe("environmentDisciplineTotals", () => {
  test("consolida ambientes por disciplina do tipo, sem abrir por tipo", () => {
    const totals = environmentDisciplineTotals([
      { environment_type_id: "t-transformadores" },
      { environment_type_id: "t-transformadores" },
      { environment_type_id: "t-elevadores" },
      { environment_type_id: "t-hidrometros-lojas" },
      { environment_type_id: "t-reservatorios" },
    ], types);
    expect(totals).toEqual({ hydraulic: 2, electrical: 3 });
  });

  test("ignora ambientes sem tipo ou com tipo removido do cadastro", () => {
    const totals = environmentDisciplineTotals([
      { environment_type_id: null },
      { environment_type_id: "t-inexistente" },
      { environment_type_id: "t-hidrometros-lojas" },
    ], types);
    expect(totals).toEqual({ hydraulic: 1, electrical: 0 });
  });
});
