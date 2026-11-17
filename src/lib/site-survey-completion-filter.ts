import type { ColumnFilterValue } from "./column-filters";

export type SurveyCompletionFilter = "all" | "pendente" | "concluida" | "cancelada";

export function matchesSurveyCompletion(status: string | null | undefined, filter: SurveyCompletionFilter) {
  return filter === "all" || (status || "pendente") === filter;
}

export function surveyPendingFilterValue(filter: "all" | "with" | "without"): ColumnFilterValue | undefined {
  return filter === "all" ? undefined : { op: filter === "with" ? "gt" : "eq", value: "0" };
}