import { isCustomerQuestion, pendingCustomerQuestions } from "@/lib/site-survey-questions";

export type ClientPendingPoint = { value: string; label: string; pointType: string; lucNumber?: string; name?: string; location?: string | null; meterNumber?: string | null };
export function unidentifiedLucPoints(points: ClientPendingPoint[]) {
  return points.filter((point) => {
    if (point.pointType !== "shop" && point.pointType !== "kiosk") return false;
    const luc = (point.lucNumber ?? "").trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
    return !luc || luc === "sem luc" || luc === "nao identificado";
  }).sort((a, b) => (a.name ?? a.label).localeCompare(b.name ?? b.label, "pt-BR", { numeric: true }));
}
export type ClientPendingResponse = { question_id: string; visit_luc_id: string | null; visit_environment_id: string | null; answer: unknown; question_snapshot?: unknown };
export type ClientPendingCall = { internal_call_id: string | null; visit_luc_id: string | null; visit_environment_id: string | null; question_id?: string; status?: string; trigger_value?: string; site_survey_question_actions?: { site_survey_action_catalog: { name: string } | null } | null; internal_calls: { call_number: string | null; title: string; description: string; status: string } | null };

export type SurveyReportText = { id: string; name: string; question_id: string; answer_value: string; report_answer: string };

export function reportResponseText(questionId: string | undefined, value: string, texts: SurveyReportText[]) {
  const rule = texts.find((text) => text.question_id === questionId && text.answer_value === value)
    ?? texts.find((text) => text.question_id === questionId && text.answer_value === "");
  const result = rule?.report_answer.trim() || value;
  const normalized = result.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase().replace(/\.$/, "");
  if (normalized === "muito rigido") return "Registro muito rígido. Risco de quebra.";
  if (normalized === "sem manopla") return "Registro sem manopla.";
  return result;
}

type ClientPendingQuestion = { id: string; prompt: string; question_key?: string | null; conditioned_on_question_id?: string | null; conditioned_operator?: string | null; conditioned_value?: string | null };

export function buildClientPendingGroups(points: ClientPendingPoint[], responses: ClientPendingResponse[], questions: ClientPendingQuestion[], calls: ClientPendingCall[], texts: SurveyReportText[] = []) {
  const customerIds = new Set(questions.filter(isCustomerQuestion).map((question) => question.id));
  const keyFor = (row: { visit_luc_id: string | null; visit_environment_id: string | null }) => row.visit_luc_id ? `luc:${row.visit_luc_id}` : row.visit_environment_id ? `environment:${row.visit_environment_id}` : "general";
  const groups = new Map(points.map((point) => [point.value, { ...point, questions: [] as string[], calls: [] as NonNullable<ClientPendingCall["internal_calls"]>[] }]));
  groups.set("general", { value: "general", label: "Pendências gerais da visita", pointType: "general", questions: [], calls: [] });
  const isActiveScope = (key: string) => key === "general" || groups.has(key);
  const groupFor = (key: string) => {
    let group = groups.get(key);
    if (!group) {
      group = { value: key, label: "Ponto vinculado ao checklist (fora do cadastro ativo)", pointType: "general", questions: [], calls: [] };
      groups.set(key, group);
    }
    return group;
  };
  const answerMatches = (value: unknown, expected: string) => {
    const expectedValues = expected.split(";").map((item) => item.trim().toLocaleLowerCase("pt-BR")).filter(Boolean);
    const actualValue = value && typeof value === "object" && !Array.isArray(value) && "value" in value ? value.value : value;
    const actualValues = (Array.isArray(actualValue) ? actualValue : [actualValue]).map((item) => String(item ?? "").trim().toLocaleLowerCase("pt-BR"));
    return expectedValues.some((item) => actualValues.includes(item));
  };
  const isQuestionVisible = (questionId: string | undefined, scopeKey: string) => {
    const question = questions.find((item) => item.id === questionId);
    if (!question?.conditioned_on_question_id || !question.conditioned_value) return true;
    const parent = responses.find((row) => row.question_id === question.conditioned_on_question_id && keyFor(row) === scopeKey);
    const matches = answerMatches(parent?.answer, question.conditioned_value);
    return question.conditioned_operator === "not_equals" ? !matches : matches;
  };
  for (const response of responses) {
    if (!isActiveScope(keyFor(response))) continue;
    const snapshot = response.question_snapshot;
    const prompt = snapshot && typeof snapshot === "object" && "prompt" in snapshot && typeof snapshot.prompt === "string" ? snapshot.prompt : "";
    const hasCustomerArray = response.answer && typeof response.answer === "object" && "customer_questions" in response.answer;
    if (!customerIds.has(response.question_id) && !isCustomerQuestion({ prompt }) && !hasCustomerArray) continue;
    const group = groupFor(keyFor(response));
    for (const text of pendingCustomerQuestions(response.answer).map((text) => text.trim()).filter(Boolean)) {
      if (!group.questions.includes(text)) group.questions.push(text);
    }
  }
  const seen = new Set<string>();
  for (const call of calls) {
    if (!isActiveScope(keyFor(call))) continue;
    if (!isQuestionVisible(call.question_id, keyFor(call))) continue;
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
      const answerText = Array.isArray(value) ? value.join(", ") : typeof value === "string" ? value : call.trigger_value ?? "";
      const rule = texts.find((item) => item.question_id === call.question_id && item.answer_value === answerText);
      const description = rule?.report_answer.trim()
        ? [rule.report_answer.trim(), detail].filter(Boolean).join(" — ")
        : [reportResponseText(call.question_id, answerText, texts), detail].filter(Boolean).join(" — ");
      groupFor(keyFor(call)).calls.push({ call_number: null, title: action, description, status: call.status ?? "aberto" });
    }
  }
  const lucOrder = (group: { value: string; label: string }) => {
    const match = /^LUC (\d+)/.exec(group.label);
    if (group.value.startsWith("luc:") && match) return { bucket: 0, num: Number(match[1]) };
    if (group.value.startsWith("luc:")) return { bucket: 1, num: 0 };
    if (group.value.startsWith("environment:")) return { bucket: 2, num: 0 };
    return { bucket: 3, num: 0 };
  };
  return [...groups.values()]
    .filter((group) => group.questions.length || group.calls.length)
    .sort((a, b) => {
      const orderA = lucOrder(a), orderB = lucOrder(b);
      if (orderA.bucket !== orderB.bucket) return orderA.bucket - orderB.bucket;
      if (orderA.num !== orderB.num) return orderA.num - orderB.num;
      return a.label.localeCompare(b.label, "pt-BR");
    });
}