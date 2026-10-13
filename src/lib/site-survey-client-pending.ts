import { isCustomerQuestion, pendingCustomerQuestions } from "@/lib/site-survey-questions";

export type ClientPendingPoint = { value: string; label: string; pointType: string };
export type ClientPendingResponse = { question_id: string; visit_luc_id: string | null; visit_environment_id: string | null; answer: unknown; question_snapshot?: unknown };
export type ClientPendingCall = { internal_call_id: string | null; visit_luc_id: string | null; visit_environment_id: string | null; internal_calls: { call_number: string | null; title: string; description: string; status: string } | null };

export function buildClientPendingGroups(points: ClientPendingPoint[], responses: ClientPendingResponse[], questions: { id: string; prompt: string; question_key?: string | null }[], calls: ClientPendingCall[]) {
  const customerIds = new Set(questions.filter(isCustomerQuestion).map((question) => question.id));
  const keyFor = (row: { visit_luc_id: string | null; visit_environment_id: string | null }) => row.visit_luc_id ? `luc:${row.visit_luc_id}` : row.visit_environment_id ? `environment:${row.visit_environment_id}` : "general";
  const groups = new Map(points.map((point) => [point.value, { ...point, questions: [] as string[], calls: [] as NonNullable<ClientPendingCall["internal_calls"]>[] }]));
  groups.set("general", { value: "general", label: "Pendências gerais da visita", pointType: "general", questions: [], calls: [] });
  const groupFor = (key: string) => {
    let group = groups.get(key);
    if (!group) {
      group = { value: key, label: "Ponto vinculado ao checklist (fora do cadastro ativo)", pointType: "general", questions: [], calls: [] };
      groups.set(key, group);
    }
    return group;
  };
  for (const response of responses) {
    const snapshot = response.question_snapshot;
    const prompt = snapshot && typeof snapshot === "object" && "prompt" in snapshot && typeof snapshot.prompt === "string" ? snapshot.prompt : "";
    const hasCustomerArray = response.answer && typeof response.answer === "object" && "customer_questions" in response.answer;
    if (!customerIds.has(response.question_id) && !isCustomerQuestion({ prompt }) && !hasCustomerArray) continue;
    const group = groupFor(keyFor(response));
    for (const text of pendingCustomerQuestions(response.answer).map((text) => text.trim()).filter(Boolean)) if (!group.questions.includes(text)) group.questions.push(text);
  }
  const seen = new Set<string>();
  for (const call of calls) {
    if (!call.internal_call_id || !call.internal_calls || seen.has(call.internal_call_id)) continue;
    seen.add(call.internal_call_id);
    groupFor(keyFor(call)).calls.push(call.internal_calls);
  }
  return [...groups.values()].filter((group) => group.questions.length || group.calls.length);
}