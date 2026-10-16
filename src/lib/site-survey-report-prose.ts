const LEADING_PREPOSITION = /^(até|de|do|da|dos|das|em|entre|acima|abaixo|mais|menos|cerca|aproximadamente)\b/i;

/**
 * In the flowing report text a value is written after a linking verb ("é de"), so a
 * preposition that opens the catalog option ("Até 5 m³/h") sits in the middle of the
 * sentence and must be lowercase there. The catalog option itself keeps its capital.
 */
export const lowerLeadingPreposition = (value: string) =>
  value.replace(LEADING_PREPOSITION, (word) => word.toLocaleLowerCase("pt-BR"));
