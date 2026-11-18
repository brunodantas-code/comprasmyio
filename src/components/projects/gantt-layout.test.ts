import { describe, expect, it } from "vitest";
import { monthlyEndPadding } from "./gantt-layout";

describe("monthly calendar coverage", () => {
  const tasks = [{ start: "2026-11-12", end: "2026-11-19" }];
  it("extends beyond January to fill a wide workspace", () => {
    expect(monthlyEndPadding(tasks, 1800)).toBe(12);
  });
  it("keeps the existing two trailing months on a narrow workspace", () => {
    expect(monthlyEndPadding(tasks, 390)).toBe(2);
  });
  it("counts activities across a year boundary", () => {
    expect(monthlyEndPadding([{ start: "2026-11-12", end: "2027-02-19" }], 1200)).toBe(4);
  });
});