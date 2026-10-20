import { answeredCustomerQuestions, customerQuestionResponses, customerQuestions } from "@/lib/site-survey-questions";

export type CustomerAnswerField = { field: string; point: string; label: string; question: string };
export type CustomerAnswerMap = { visit: string; fields: CustomerAnswerField[] };

const PREFIX = "myio-cq:";

export function encodeCustomerAnswerMap(map: CustomerAnswerMap) {
  const bytes = new TextEncoder().encode(JSON.stringify(map));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return PREFIX + btoa(binary);
}

export function decodeCustomerAnswerMap(subject: string | undefined | null): CustomerAnswerMap | null {
  if (!subject?.startsWith(PREFIX)) return null;
  try {
    const binary = atob(subject.slice(PREFIX.length));
    const parsed = JSON.parse(new TextDecoder().decode(Uint8Array.from(binary, (char) => char.charCodeAt(0))));
    return parsed && typeof parsed.visit === "string" && Array.isArray(parsed.fields) ? parsed : null;
  } catch { return null; }
}

/** Grava a resposta do cliente e dá baixa na pergunta, preservando o restante da resposta do checklist. */
export function applyCustomerAnswer(existing: unknown, question: string, response: string) {
  const rows = customerQuestions(existing);
  const answered = answeredCustomerQuestions(existing);
  const base = existing && typeof existing === "object" && !Array.isArray(existing) ? existing : { value: rows.join("\n") };
  return {
    ...base,
    value: rows.join("\n"),
    customer_questions: rows,
    customer_questions_answered: answered.includes(question) ? answered : [...answered, question],
    customer_question_responses: { ...customerQuestionResponses(existing), [question]: response.trim() },
  };
}
