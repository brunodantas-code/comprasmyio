/** Display-only conversion: original bank text remains available for audit and saving. */
export function spendDescription(text: string, sentenceCase: boolean): string {
  if (!sentenceCase) return text;
  return text.toLocaleLowerCase("pt-BR").replace(/\p{L}/u, first => first.toLocaleUpperCase("pt-BR"));
}