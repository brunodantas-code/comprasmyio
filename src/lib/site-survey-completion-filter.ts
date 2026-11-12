export type SurveyCompletionFilter = "all" | "pendente" | "concluida" | "cancelada";

export function matchesSurveyCompletion(status: string | null | undefined, filter: SurveyCompletionFilter) {
  return filter === "all" || (status || "pendente") === filter;
}