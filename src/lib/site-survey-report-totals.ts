/** Totalizadores com ordem fixa: do mais fácil para o mais difícil, como Baixa, Média e Alta. */
export const TOTAL_ORDERS: Record<string, string[]> = {
  "Dificuldade de acesso": ["Fácil", "Regular", "Difícil"],
  "Complexidade hidráulica": ["Baixa", "Média", "Alta"],
  "Complexidade elétrica": ["Baixa", "Média", "Alta"],
};

const orderRank = (label: string, value: string) => {
  const order = TOTAL_ORDERS[label];
  if (!order) return 0;
  const index = order.indexOf(value);
  return index < 0 ? order.length : index;
};

/** Ordena os valores de um totalizador; grupos sem ordem definida mantêm a sequência de chegada. */
export function sortTotalValues(label: string, entries: [string, number][]): [string, number][] {
  return [...entries].sort((a, b) => orderRank(label, a[0]) - orderRank(label, b[0]));
}

const clean = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").replace(/[.\s]+$/g, "");

/** O atalho "Nenhuma observação adicional" não é conteúdo: sem observação real, o bloco não é exibido. */
export const REVIEW_EMPTY_NOTE = "Nenhuma observação adicional";

export function reviewNoteText(text: string) {
  return clean(text) === clean(REVIEW_EMPTY_NOTE) ? "" : text;
}
