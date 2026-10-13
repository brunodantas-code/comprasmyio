import { isCustomerQuestion, pendingCustomerQuestions } from "@/lib/site-survey-questions";

export type ClientPendingPoint = { value: string; label: string; pointType: string };
export type ClientPendingResponse = { question_id: string; visit_luc_id: string | null; visit_environment_id: string | null; answer: unknown; question_snapshot?: unknown };
export type ClientPendingCall = { internal_call_id: string | null; visit_luc_id: string | null; visit_environment_id: string | null; question_id?: string; status?: string; trigger_value?: string; site_survey_question_actions?: { site_survey_action_catalog: { name: string } | null } | null; internal_calls: { call_number: string | null; title: string; description: string; status: string } | null };

export type SurveyReportText = { id: string; name: string; question_id: string; answer_value: string; report_question: string; report_answer: string };

export function reportResponseText(questionId: string | undefined, prompt: string, value: string, texts: SurveyReportText[]) {
  const rule = texts.find((text) => text.question_id === questionId && text.answer_value === value)
    ?? texts.find((text) => text.question_id === questionId && text.answer_value === "");
  return [rule?.report_question.trim() || prompt, rule?.report_answer.trim() || value].filter(Boolean).join(" — ");
}

export function buildClientPendingGroups(points: ClientPendingPoint[], responses: ClientPendingResponse[], questions: { id: string; prompt: string; question_key?: string | null }[], calls: ClientPendingCall[], texts: SurveyReportText[] = []) {
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
    for (const text of pendingCustomerQuestions(response.answer).map((text) => text.trim()).filter(Boolean)) {
      const rule = texts.find((item) => item.question_id === response.question_id && item.answer_value === text);
      const display = rule?.report_question.trim() || text;
      if (!group.questions.includes(display)) group.questions.push(display);
    }
  }
  const seen = new Set<string>();
  for (const call of calls) {
    if (call.internal_call_id && call.internal_calls) {
      if (seen.has(call.internal_call_id)) continue;
      seen.add(call.internal_call_id);
      groupFor(keyFor(call)).calls.push(call.internal_calls);
    } else {
      const action = call.site_survey_question_actions?.site_survey_action_catalog?.name ?? "";
      if (!action.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().includes("intervencao do cliente") || call.status === "cancelado") continue;
      const response = responses.find((row) => row.question_id === call.question_id && keyFor(row) === keyFor(call));
      const answer = response?.answer;
      const value = answer && typeof answer === "object" && "value" in answer ? answer.value : answer;
      const detail = answer && typeof answer === "object" && "detail" in answer && typeof answer.detail === "string" ? answer.detail : "";
      const prompt = questions.find((question) => question.id === call.question_id)?.prompt ?? "";
      const answerText = Array.isArray(value) ? value.join(", ") : typeof value === "string" ? value : call.trigger_value ?? "";
      const rule = texts.find((item) => item.question_id === call.question_id && item.answer_value === answerText);
      const description = rule?.report_answer.trim()
        ? [rule.report_question.trim(), rule.report_answer.trim(), detail].filter(Boolean).join(" — ")
        : [reportResponseText(call.question_id, prompt, answerText, texts), detail].filter(Boolean).join(" — ");
      groupFor(keyFor(call)).calls.push({ call_number: null, title: action, description, status: call.status ?? "aberto" });
    }
  }
  return [...groups.values()].filter((group) => group.questions.length || group.calls.length);
}