import { describe, expect, it } from "vitest";
import { canCompleteSurveyVisit, surveyVisitCompletionTime } from "./site-survey-visit-completion";

describe("encerramento técnico independente das pendências", () => {
  it("permite encerrar visita em andamento sem exigir conclusão dos pontos", () => {
    expect(canCompleteSurveyVisit("em_andamento")).toBe(true);
  });
  it("permite encerrar visita em revisão", () => {
    expect(canCompleteSurveyVisit("em_revisao")).toBe(true);
  });
  it("não reabre visitas já concluídas", () => {
    expect(canCompleteSurveyVisit("concluida")).toBe(false);
  });
  it("preserva o encerramento técnico original", () => {
    expect(surveyVisitCompletionTime("2026-11-23", "14:00", null, "2026-10-07T18:00:00Z")).toBe("2026-10-07T18:00:00Z");
  });
  it("exige informar o encerramento real em vez de presumir hoje", () => {
    expect(() => surveyVisitCompletionTime("", "", null, null)).toThrow();
  });
  it("rejeita data futura", () => {
    expect(() => surveyVisitCompletionTime("2026-11-24", "10:00", null, null, new Date("2026-11-23T00:00:00Z"))).toThrow();
  });
  it("rejeita término anterior ao início técnico", () => {
    expect(() => surveyVisitCompletionTime("2026-11-20", "10:00", "2026-11-21T00:00:00Z", null, new Date("2026-11-23T00:00:00Z"))).toThrow();
  });
});