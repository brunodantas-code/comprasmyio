import { describe, expect, it } from "vitest";
import { surveyReportOptions, surveyReportPointLabel, surveyReportSkippedText, surveyReportText } from "./site-survey-report-options";

describe("complete survey report audience", () => {
  it("excludes internal planning/calls from the client edition", () => {
    expect(surveyReportOptions("complete")).toEqual({ complete: true, internal: false });
  });
  it("preserves internal planning/calls in the internal edition", () => {
    expect(surveyReportOptions("complete-internal")).toEqual({ complete: true, internal: true });
  });
  it("does not turn specialized reports into complete reports", () => {
    expect(surveyReportOptions("purchases")).toEqual({ complete: false, internal: false });
  });
});

describe("report display preserves original survey data", () => {
  it("merges Subi and Sub classifications without altering the source", () => {
    const original = "Outros — Subi estação 2";
    expect(surveyReportText(original)).toBe("Outros — Sub estação 2");
    expect(original).toBe("Outros — Subi estação 2");
    expect(surveyReportText("Outros — Sub estação 2")).toBe(surveyReportText(original));
    expect(surveyReportText("Outros — Subi estação 3".normalize("NFD"))).toBe("Outros — Sub estação 3");
  });
  it("applies Aa to the name while keeping the LUC identifier", () => {
    expect(surveyReportPointLabel("LUC SVV00006 — GARAGE ESTETICA AUTOMOTIVA", "GARAGE ESTETICA AUTOMOTIVA", true)).toBe("LUC SVV00006 — Garage estetica automotiva");
    expect(surveyReportPointLabel("LUC SVV00006 — GARAGE ESTETICA AUTOMOTIVA", "GARAGE ESTETICA AUTOMOTIVA", false)).toBe("LUC SVV00006 — GARAGE ESTETICA AUTOMOTIVA");
  });
  it("preserves manually mixed case and acronyms", () => {
    expect(surveyReportPointLabel("LUC A — Provincia do Pão (AR)", "Provincia do Pão (AR)", true)).toBe("LUC A — Provincia do Pão (AR)");
  });
  it("identifies the equipment shortcut independently of missing data", () => {
    expect(surveyReportSkippedText("tools", ["tools"], "equipment")).toBe("Não é necessário equipamento ou ferramenta especial.");
    expect(surveyReportSkippedText("tools", [], "equipment")).toBe("");
  });
  it("identifies the no-observation shortcut", () => {
    expect(surveyReportSkippedText("notes", ["notes"], "review")).toBe("Nenhuma observação adicional.");
  });
  it("keeps not-applicable sections out of the report", () => {
    expect(surveyReportSkippedText("notes", ["not-applicable:notes"], "review")).toBe("");
  });
});