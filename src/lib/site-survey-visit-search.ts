// Builds the lowercase search text used by the visits list, including the
// names of lojas/quiosques and ambientes so a chain (e.g. Burguer King) can be
// located across shoppings.
export function visitSearchHaystack(parts: Array<string | number | null | undefined>, pointNames?: string): string {
  return [parts.join(" "), pointNames ?? ""].join(" ").toLocaleLowerCase("pt-BR");
}
