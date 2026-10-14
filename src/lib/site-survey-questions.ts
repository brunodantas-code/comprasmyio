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