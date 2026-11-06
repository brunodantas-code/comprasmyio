import type { FilterKind } from "./column-filters";

export type SortDirection = "asc" | "desc";
export type SortValue = string | number | null | undefined;

/** Missing values stay last in both directions; ISO dates sort chronologically. */
export function compareColumnValues(kind: FilterKind, a: SortValue, b: SortValue, direction: SortDirection): number {
  const emptyA = a == null || String(a).trim() === "";
  const emptyB = b == null || String(b).trim() === "";
  if (emptyA || emptyB) return emptyA === emptyB ? 0 : emptyA ? 1 : -1;
  const result = kind === "number"
    ? Number(a) - Number(b)
    : String(a).localeCompare(String(b), "pt-BR", { numeric: true, sensitivity: "base" });
  return direction === "asc" ? result : -result;
}