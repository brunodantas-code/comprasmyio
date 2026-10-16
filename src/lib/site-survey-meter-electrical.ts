export const METER_ELECTRICAL_CATALOG_PURPOSE = "meter_electrical";
type Question = { id: string; section_id: string; prompt: string };
type Response = { question_id: string; answer: unknown };
export type MeterElectricalItem = { id: string; name: string; quantity: number; unit: string; active: boolean };
const normalize = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").trim();
const selectedValue = (answer: unknown): string => {
  if (answer && typeof answer === "object" && "value" in answer) return selectedValue(answer.value);
  return typeof answer === "string" ? normalize(answer.split(/[—–]/)[0]) : "";
};
export function meterElectricalItemsForPoint(responses: Response[], questions: Question[], skippedSectionIds: string[], completionStatus: string, catalogItems: MeterElectricalItem[]): MeterElectricalItem[] {
  if (completionStatus === "cancelada") return [];
  const eligible = responses.some((response) => {
    const question = questions.find((item) => item.id === response.question_id);
    if (!question || skippedSectionIds.includes(question.section_id)) return false;
    const prompt = normalize(question.prompt);
    return /existe ponto (?:de eletrica|eletrico) proximo/.test(prompt) && prompt.includes("hidrometro") && selectedValue(response.answer) === "sim";
  });
  return eligible ? catalogItems.filter((item) => item.active && Number.isFinite(item.quantity) && item.quantity > 0) : [];
}
export function validCatalogQuantity(quantity: number, unit: string) {
  return Number.isFinite(quantity) && quantity > 0 && (unit === "m" || unit === "un");
}
export function formatPurchaseQuantity(quantity: number, unit?: string): string {
  return `${quantity.toLocaleString("pt-BR", { maximumFractionDigits: 4 })}${unit ? ` ${unit}` : ""}`;
}
