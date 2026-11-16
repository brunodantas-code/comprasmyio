import { isFilterActive, matchesColumnFilter, type ColumnFilterValue } from "./column-filters";

/** Positive conditions can match any field; exclusions must hold for every field. */
export function matchesCodeTicketSearch(texts: readonly string[], filter: ColumnFilterValue): boolean {
  if (!isFilterActive(filter)) return true;
  const values = texts.filter(text => text.trim());
  const fields = values.length ? values : [""];
  const match = (text: string) => matchesColumnFilter("text", text, text, filter);
  return filter.op === "not_contains" || filter.op === "not_equals" ? fields.every(match) : fields.some(match);
}