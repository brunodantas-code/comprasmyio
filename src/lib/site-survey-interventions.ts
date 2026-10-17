// Contagem de intervenções do cliente por ponto, usada no selo vermelho da fachada.
export type InterventionCallRow = {
  question_id?: string;
  visit_luc_id: string | null;
  visit_environment_id: string | null;
  status?: string;
  internal_call_id?: string | null;
  internal_calls?: { status?: string | null } | null;
  site_survey_question_actions?: { site_survey_action_catalog?: { name: string } | null } | null;
};

const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLocaleLowerCase("pt-BR");

export function isClientInterventionCall(call: InterventionCallRow) {
  const action = call.site_survey_question_actions?.site_survey_action_catalog?.name ?? "";
  if (!normalize(action).includes("intervencao do cliente")) return false;
  if (call.status === "cancelado") return false;
  if (call.internal_calls?.status === "cancelado") return false;
  return true;
}

export function countPointInterventions(calls: InterventionCallRow[]) {
  const counts = new Map<string, number>();
  const seen = new Set<string>();
  for (const call of calls) {
    if (!isClientInterventionCall(call)) continue;
    const key = call.visit_luc_id ? `luc:${call.visit_luc_id}` : call.visit_environment_id ? `environment:${call.visit_environment_id}` : null;
    if (!key) continue;
    const unique = `${key}|${call.question_id ?? ""}`;
    if (seen.has(unique)) continue;
    seen.add(unique);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}
