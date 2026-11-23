import { surveyNameCase } from "./site-survey-name-case";

export type SurveyReportType = "complete" | "complete-internal" | "purchases" | "interventions" | "equipment";

export function surveyReportOptions(type: SurveyReportType) {
  return {
    complete: type === "complete" || type === "complete-internal",
    internal: type === "complete-internal",
  };
}

/** Correct the known spelling error for display/grouping, without rewriting responses. */
export function surveyReportText(text: string): string {
  return text.normalize("NFC").replace(/\bsubi(?=\s+esta[cç][aã]o(?:\s|$))/gi, "Sub");
}

export function surveyReportPointLabel(label: string, name: string, sentenceCase: boolean): string {
  const prefix = label.endsWith(name) ? label.slice(0, label.length - name.length) : "";
  return prefix + surveyNameCase(surveyReportText(name), sentenceCase);
}

export function surveyReportSkippedText(sectionId: string | undefined, dispositions: string[], kind: "equipment" | "review"): string {
  if (!sectionId || !dispositions.includes(sectionId) || dispositions.includes(`not-applicable:${sectionId}`)) return "";
  return kind === "equipment" ? "Não é necessário equipamento ou ferramenta especial." : "Nenhuma observação adicional.";
}