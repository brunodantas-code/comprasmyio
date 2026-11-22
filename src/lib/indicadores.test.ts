import { describe, it, expect } from "vitest";
import { metricProgress, cycleDates, objectiveProgress, checkinDue } from "./indicadores";
describe("Indicadores", () => {
  it("mede porcentagem de 0 a 100", () => expect(metricProgress(0, 100, 40)).toBe(40));
  it("mede evolução de vendas de 50 mil a 100 mil", () =>
    expect(metricProgress(50000, 100000, 75000)).toBe(50));
  it("mede metas decrescentes", () => expect(metricProgress(10, 5, 7.5)).toBe(50));
  it("marco feito representa 100%", () => expect(metricProgress(0, 1, 1)).toBe(100));
  it("trimestres abrangem Q1 e Q4", () => {
    expect(cycleDates(2026, "quarter", 1)).toEqual({
      starts_on: "2026-01-01",
      ends_on: "2026-03-31",
    });
    expect(cycleDates(2026, "quarter", 4)).toEqual({
      starts_on: "2026-10-01",
      ends_on: "2026-12-31",
    });
  });
  it("semestre e ano abrangem períodos completos", () => {
    expect(cycleDates(2026, "semester", 2).ends_on).toBe("2026-12-31");
    expect(cycleDates(2026, "year").starts_on).toBe("2026-01-01");
  });
  it("propaga o progresso do indivíduo ao objetivo global", () =>
    expect(
      objectiveProgress(
        "empresa",
        [
          { id: "empresa", parent_id: null },
          { id: "pessoa", parent_id: "empresa" },
        ],
        [{ objective_id: "pessoa", initial_value: 0, target_value: 100, current_value: 65 }],
      ),
    ).toBe(65));
  it("check-in é semanal", () => {
    expect(checkinDue("2026-11-15T12:00:00Z", new Date("2026-11-22T12:00:00Z"))).toBe(true);
    expect(checkinDue("2026-11-16T12:00:00Z", new Date("2026-11-22T12:00:00Z"))).toBe(false);
  });
});
