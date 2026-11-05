// Filtros de coluna no estilo Excel: lista de valores + condição (texto, número ou data).
export type FilterKind = "text" | "number" | "date";

export type TextOp = "contains" | "not_contains" | "equals" | "not_equals" | "starts" | "ends" | "empty" | "not_empty";
export type NumberOp = "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "between" | "empty" | "not_empty";
export type DateOp = "on" | "not_on" | "before" | "after" | "between" | "empty" | "not_empty";
export type FilterOp = TextOp | NumberOp | DateOp;

export interface ColumnFilterValue {
  op?: FilterOp;
  value?: string;
  value2?: string;
  /** Valores marcados na lista (como no Excel). undefined = todos. */
  selected?: string[];
}

export const OP_LABELS: Record<FilterKind, { op: FilterOp; label: string }[]> = {
  text: [
    { op: "contains", label: "Contém" },
    { op: "not_contains", label: "Não contém" },
    { op: "equals", label: "É igual a" },
    { op: "not_equals", label: "Diferente de" },
    { op: "starts", label: "Começa com" },
    { op: "ends", label: "Termina com" },
    { op: "empty", label: "Está vazio" },
    { op: "not_empty", label: "Não está vazio" },
  ],
  number: [
    { op: "eq", label: "É igual a" },
    { op: "neq", label: "Diferente de" },
    { op: "gt", label: "Maior que" },
    { op: "gte", label: "Maior ou igual a" },
    { op: "lt", label: "Menor que" },
    { op: "lte", label: "Menor ou igual a" },
    { op: "between", label: "Entre" },
    { op: "empty", label: "Está vazio" },
    { op: "not_empty", label: "Não está vazio" },
  ],
  date: [
    { op: "on", label: "Em" },
    { op: "not_on", label: "Diferente de" },
    { op: "before", label: "Antes de" },
    { op: "after", label: "Depois de" },
    { op: "between", label: "Entre" },
    { op: "empty", label: "Está vazio" },
    { op: "not_empty", label: "Não está vazio" },
  ],
};

export const EMPTY_LABEL = "(Vazias)";

export function normalizeText(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

/** Aceita "1.234,56", "1234.56", "R$ 10". */
export function parseNumber(s: string | undefined | null): number | null {
  if (s == null) return null;
  let t = String(s).replace(/[^\d,.-]/g, "");
  if (!t) return null;
  if (t.includes(",")) t = t.replace(/\./g, "").replace(",", ".");
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export function isFilterActive(f: ColumnFilterValue | undefined): boolean {
  if (!f) return false;
  if (f.selected) return true;
  if (!f.op) return false;
  if (f.op === "empty" || f.op === "not_empty") return true;
  if (f.op === "between") return !!(f.value || f.value2);
  return !!f.value;
}

function matchCondition(kind: FilterKind, raw: string | number | null | undefined, f: ColumnFilterValue): boolean {
  const isEmpty = raw == null || String(raw).trim() === "";
  if (f.op === "empty") return isEmpty;
  if (f.op === "not_empty") return !isEmpty;
  if (kind === "text") {
    const v = normalizeText(String(raw ?? ""));
    const q = normalizeText(f.value ?? "");
    switch (f.op) {
      case "contains": return v.includes(q);
      case "not_contains": return !v.includes(q);
      case "equals": return v === q;
      case "not_equals": return v !== q;
      case "starts": return v.startsWith(q);
      case "ends": return v.endsWith(q);
      default: return true;
    }
  }
  if (kind === "number") {
    if (isEmpty) return f.op === "neq";
    const v = typeof raw === "number" ? raw : parseNumber(String(raw));
    if (v == null) return false;
    const a = parseNumber(f.value);
    const b = parseNumber(f.value2);
    switch (f.op) {
      case "eq": return a == null || v === a;
      case "neq": return a == null || v !== a;
      case "gt": return a == null || v > a;
      case "gte": return a == null || v >= a;
      case "lt": return a == null || v < a;
      case "lte": return a == null || v <= a;
      case "between": return (a == null || v >= a) && (b == null || v <= b);
      default: return true;
    }
  }
  // date: valores ISO yyyy-mm-dd comparam como texto
  if (isEmpty) return f.op === "not_on";
  const v = String(raw).slice(0, 10);
  const a = f.value ?? "";
  const b = f.value2 ?? "";
  switch (f.op) {
    case "on": return !a || v === a;
    case "not_on": return !a || v !== a;
    case "before": return !a || v < a;
    case "after": return !a || v > a;
    case "between": return (!a || v >= a) && (!b || v <= b);
    default: return true;
  }
}

/** listValue: texto exibido na lista de valores; raw: valor usado na condição. */
export function matchesColumnFilter(
  kind: FilterKind,
  raw: string | number | null | undefined,
  listValue: string,
  f: ColumnFilterValue | undefined,
): boolean {
  if (!isFilterActive(f) || !f) return true;
  if (f.selected) {
    const key = listValue.trim() === "" ? EMPTY_LABEL : listValue;
    if (!f.selected.includes(key)) return false;
  }
  const conditionActive = isFilterActive({ ...f, selected: undefined });
  return conditionActive ? matchCondition(kind, raw, f) : true;
}
