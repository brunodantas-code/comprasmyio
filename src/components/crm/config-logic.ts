export const UFS = "AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO".split(" ");
export function cnpjDigits(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 14) throw new Error("Informe um CNPJ com 14 dígitos.");
  return digits;
}
export const leadStage = (lead: { etapa_codigo?: string | null; status: string | null }) => lead.etapa_codigo ?? lead.status ?? "novo";
export function configNumber(value: string, min = 0, max = Number.MAX_SAFE_INTEGER) {
  const number = Number(value);
  if (!value.trim() || !Number.isInteger(number) || number < min || number > max) throw new Error(`Informe um número inteiro entre ${min} e ${max}.`);
  return number;
}