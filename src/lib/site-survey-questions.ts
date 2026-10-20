export type SurveyAnswerType = "radio" | "multiselect" | "textarea" | "number";

export function simplifiedAnswerType(type: string): SurveyAnswerType {
  if (type === "multiselect" || type === "number") return type;
  return type === "text" || type === "textarea" ? "textarea" : "radio";
}

// Preserve legacy storage and boolean conditions when the category is unchanged.
export function persistedAnswerType(selected: string, previous?: string): string {
  return previous && simplifiedAnswerType(previous) === selected ? previous : selected;
}

export function isCustomerQuestion(question: { prompt: string; question_key?: string | null }): boolean {
  const prompt = question.prompt.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLocaleLowerCase("pt-BR");
  return question.question_key === "shopping_customer_questions" || prompt === "perguntas para o cliente";
}

/**
 * Client questions are answered in the checklist history and published in the reports.
 * The "Sanar Pendências" screen must neither list them nor allow adding new ones.
 */
export function showsCustomerQuestions(view: "execution" | "summary" | "pending"): boolean {
  return view !== "pending";
}

export function registrationCustomerQuestion<T extends { id: string; section_id: string; active: boolean; prompt: string; question_key?: string | null }>(questions: T[], sections: { id: string; template_id: string; active: boolean }[], pointTemplateId: string | null, visitTemplateId: string | null, storedQuestionIds: string[] = []): T | undefined {
  const candidates = questions.filter((question) => question.active && isCustomerQuestion(question));
  const stored = candidates.find((question) => storedQuestionIds.includes(question.id));
  if (stored) return stored;
  for (const templateId of [pointTemplateId, visitTemplateId]) {
    const sectionIds = new Set(sections.filter((section) => section.active && section.template_id === templateId).map((section) => section.id));
    const question = candidates.find((candidate) => sectionIds.has(candidate.section_id));
    if (question) return question;
  }
  return undefined;
}

export function customerQuestions(answer: unknown): string[] {
  if (answer && typeof answer === "object" && !Array.isArray(answer)) {
    if ("customer_questions" in answer && Array.isArray(answer.customer_questions)) {
      return answer.customer_questions.filter((value): value is string => typeof value === "string");
    }
    if ("value" in answer) return customerQuestions(answer.value);
  }
  // Do not split legacy text: line breaks may belong to one original question.
  return typeof answer === "string" && answer.trim() ? [answer] : [];
}

export function numberedCustomerQuestions(answer: unknown): string[] {
  return customerQuestions(answer).map((value) => value.trim()).filter(Boolean).map((value, index) => `${index + 1}. ${value}`);
}

export function answeredCustomerQuestions(answer: unknown): string[] {
  const answered = (answer && typeof answer === "object" && !Array.isArray(answer) ? (answer as { customer_questions_answered?: unknown }).customer_questions_answered : null);
  if (Array.isArray(answered)) {
    return answered.filter((value): value is string => typeof value === "string");
  }
  return [];
}

export function customerQuestionResponses(answer: unknown): Record<string, string> {
  const responses = answer && typeof answer === "object" && !Array.isArray(answer)
    ? (answer as { customer_question_responses?: unknown }).customer_question_responses
    : null;
  if (!responses || typeof responses !== "object" || Array.isArray(responses)) return {};
  return Object.fromEntries(Object.entries(responses).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
}

// Registered questions stay pending until someone marks them as answered.
export function pendingCustomerQuestions(answer: unknown): string[] {
  const answered = new Set(answeredCustomerQuestions(answer));
  return customerQuestions(answer).filter((value) => !answered.has(value));
}
/** Customer Q&A keeps its original section visible after a point changes templates. */
export function customerHistorySectionIds(
  questions: { id: string; section_id: string; prompt: string; question_key?: string | null }[],
  responses: { question_id: string; answer: unknown }[],
): Set<string> {
  return new Set(questions.filter((question) => responses.some((response) =>
    response.question_id === question.id &&
    (isCustomerQuestion(question) || (response.answer !== null && typeof response.answer === "object" && "customer_questions" in response.answer)) &&
    customerQuestions(response.answer).length > 0,
  )).map((question) => question.section_id));
}
