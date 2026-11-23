export const spendStates = ["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"] as const;
const stateCodes: Record<string, string> = { "11": "RO", "12": "AC", "13": "AM", "14": "RR", "15": "PA", "16": "AP", "17": "TO", "21": "MA", "22": "PI", "23": "CE", "24": "RN", "25": "PB", "26": "PE", "27": "AL", "28": "SE", "29": "BA", "31": "MG", "32": "ES", "33": "RJ", "35": "SP", "41": "PR", "42": "SC", "43": "RS", "50": "MS", "51": "MT", "52": "GO", "53": "DF" };

export function validSpendAccessKey(value: string | null | undefined): string | null {
  const key = (value ?? "").replace(/\s/g, "");
  if (!/^\d{44}$/.test(key) || !stateCodes[key.slice(0, 2)] || !["55", "65"].includes(key.slice(20, 22))) return null;
  let sum = 0;
  for (let i = 42; i >= 0; i--) sum += Number(key.charAt(i)) * (2 + (42 - i) % 8);
  const remainder = sum % 11;
  return Number(key.charAt(43)) === (remainder < 2 ? 0 : 11 - remainder) ? key : null;
}

export function spendFiscalLocation(item: { cidade?: string | null; uf?: string | null; chave_acesso?: string | null }) {
  const access_key = validSpendAccessKey(item.chave_acesso);
  const textUf = item.uf?.trim().toUpperCase() ?? "";
  return { city: item.cidade?.trim().slice(0, 120) || "", uf: (access_key ? stateCodes[access_key.slice(0, 2)] : undefined) ?? (spendStates.some(state => state === textUf) ? textUf : ""), access_key };
}