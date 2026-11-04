import { describe, expect, it } from "vitest";
import { kpiStatus, periodLabel, periodStart } from "./mytosis-kpis";

describe("KPIs", () => {
  it("classifica atingimento da meta", () => {
    expect(kpiStatus(100, 100)).toBe("ok");
    expect(kpiStatus(92, 100)).toBe("atencao");
    expect(kpiStatus(80, 100)).toBe("critico");
    expect(kpiStatus(null, 100)).toBe("sem_dado");
  });
  it("calcula início do período", () => {
    const d = new Date(2026, 10, 4); // quarta 04/11/2026
    expect(periodStart(d, "semanal")).toBe("2026-11-02");
    expect(periodStart(d, "mensal")).toBe("2026-11-01");
    expect(periodStart(d, "trimestral")).toBe("2026-10-01");
    expect(periodStart(d, "semestral")).toBe("2026-07-01");
    expect(periodStart(d, "anual")).toBe("2026-01-01");
    expect(periodLabel("2026-10-01", "trimestral")).toBe("4º tri/2026");
  });
});
