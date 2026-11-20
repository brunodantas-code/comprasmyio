import { answeredCustomerQuestions, customerQuestionResponses, customerQuestions } from "@/lib/site-survey-questions";

export type CustomerAnswerField = { field: string; point: string; label: string; question: string };
export type ClientReportField = CustomerAnswerField & { kind?: "answer" | "observation" | "confirmation"; category?: "duplicate" | "vacant"; choice?: "OK" | "Duplicado" };
export type CustomerAnswerMap = { visit: string; fields: ClientReportField[]; version?: number };
export type ClientReportItem = ClientReportField & { answer: string };

export function appendClientObservation(existing: unknown, text: string) {
  const base = existing && typeof existing === "object" && !Array.isArray(existing) ? existing : { value: typeof existing === "string" ? existing : "" };
  const value = "value" in base && typeof base.value === "string" ? base.value : "";
  const lines = value === "Nenhuma observação adicional" ? [] : value.split("\n\n").filter(Boolean);
  if (!lines.includes(text.trim())) lines.push(text.trim());
  return { ...base, value: lines.join("\n\n") };
}

export function confirmedReportPoints(items: ClientReportField[], category: "duplicate" | "vacant") {
  return new Set(items.filter((item) => item.kind === "confirmation" && item.category === category).map((item) => item.point));
}

/** Never infer an old PDF row from today's order: identify its printed LUC/name instead. */
export function matchLegacyReportPoint(row: string[], points: { value: string; label: string; name?: string; lucNumber?: string | null; location?: string | null }[]) {
  const normalize = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").replace(/\s+/g, " ").trim();
  const tokens = row.map(normalize).filter(Boolean);
  const words = tokens.flatMap((token) => token.split(" "));
  const printed = ` ${tokens.join(" ")} `;
  const lucMatches = points.filter((point) => {
    const luc = normalize(point.lucNumber ?? "");
    return luc && !["sem luc", "nao identificado"].includes(luc) && words.includes(luc);
  });
  if (lucMatches.length === 1) return lucMatches[0];
  if (lucMatches.length > 1) return undefined;
  const candidates = points.filter((point) => {
    const luc = normalize(point.lucNumber ?? ""), name = normalize(point.name ?? "");
    return (!luc || ["sem luc", "nao identificado"].includes(luc)) && Boolean(name && !["nao identificado", "sem nome"].includes(name) && printed.includes(` ${name} `));
  });
  if (candidates.length === 1) return candidates[0];
  const located = candidates.filter((point) => point.location && tokens.includes(normalize(point.location)));
  return located.length === 1 ? located[0] : undefined;
}

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
