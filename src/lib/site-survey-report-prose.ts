const LEADING_PREPOSITION = /^(até|de|do|da|dos|das|em|entre|acima|abaixo|mais|menos|cerca|aproximadamente)(?!\p{L})/iu;

/**
 * In the flowing report text a value is written after a linking verb ("é de"), so a
 * preposition that opens the catalog option ("Até 5 m³/h") sits in the middle of the
 * sentence and must be lowercase there. The catalog option itself keeps its capital.
 */
export const lowerLeadingPreposition = (value: string) =>
  value.replace(LEADING_PREPOSITION, (word) => word.toLocaleLowerCase("pt-BR"));

export type ProsePart = { text: string; bold?: boolean };

const UNINFORMED = /^(nao informad[oa]|nao foi informad[oa]|sem informacao)$/i;

const withoutAccents = (value: string) =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const isUninformedAnswer = (value: string) => UNINFORMED.test(withoutAccents(value));

/**
 * Sentences for the register that exists at the meter point when its type was left as
 * "Não informado": the report never prints that option as a value, it states that the
 * type was not informed. The condition is only mentioned when the technician answered
 * it, and when both were left out they are reported in a single sentence. An empty
 * result means the type was informed and the caller writes the normal sentence.
 */
export const uninformedRegisterSentences = (
  type: string | null,
  condition: string | null,
): ProsePart[] => {
  if (!type || !isUninformedAnswer(type)) return [];
  if (!condition) return [{ text: "Não foi informado o tipo de registro existente", bold: true }, { text: ". " }];
  if (isUninformedAnswer(condition)) return [{ text: "O tipo e a condição do registro " }, { text: "não foram informados", bold: true }, { text: ". " }];
  return [{ text: "O tipo de registro existente " }, { text: "não foi informado", bold: true }, { text: ", mas encontra-se " }, { text: condition, bold: true }, { text: ". " }];
};

/** Absence markers are not physical locations. */
export const isUninformedLocation = (value: string) => {
  const text = withoutAccents(value).trim().replace(/[.!?]+$/, "");
  return /^(?:nao (?:foi )?informad[oa]|sem informacao)(?:\s+(?:sobre|da|do|de|a|o)\b.*)?$/i.test(text);
};

/** Unverifiable flow differs from a rate that was simply not informed. */
export const flowRateStatus = (value: string): "informed" | "uninformed" | "unverifiable" => {
  const text = withoutAccents(value).trim();
  if (/nao (?:e |foi )?possivel (?:verificar|identificar|ler)|nao (?:foi possivel )?verificad[oa]|impossivel verificar/i.test(text)) return "unverifiable";
  if (!text || /nao (?:foi )?informad[oa]|sem informacao|nao legivel|ilegivel|nao identificado/i.test(text)) return "uninformed";
  return "informed";
};

export const meterFlowTitleData = (value: string | null, specification: string | null) => {
  const flow = (value ?? "").replace(/^outros?\s*[—–-]\s*/i, "").trim();
  return flowRateStatus(flow) === "informed"
    ? { flow, specification }
    : { flow: null, specification: null };
};
