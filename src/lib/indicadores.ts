export type Measure = "percentage" | "number" | "currency" | "binary";
export type Confidence = "on_track" | "at_risk" | "late";
export const CONFIDENCES = [
  { value: "on_track", label: "No prazo" },
  { value: "at_risk", label: "Em risco" },
  { value: "late", label: "Atrasado" },
] as const;
export const MEASURES = [
  { value: "percentage", label: "Porcentagem" },
  { value: "number", label: "Numérico / Valor" },
  { value: "currency", label: "Moeda" },
  { value: "binary", label: "Binário / Marco" },
] as const;
export function metricProgress(initial: number, target: number, current: number) {
  if (![initial, target, current].every(Number.isFinite) || initial === target) return 0;
  return (
    Math.round(Math.max(0, Math.min(100, ((current - initial) / (target - initial)) * 100)) * 10) /
    10
  );
}
export function metricValue(value: number, measure: string, unit = "") {
  if (measure === "binary") return value === 1 ? "Feito" : "Não feito";
  if (measure === "currency")
    return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  return `${value.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}${measure === "percentage" ? "%" : unit ? ` ${unit}` : ""}`;
}
export function cycleDates(year: number, type: string, index = 1) {
  const count = type === "quarter" ? 3 : type === "semester" ? 6 : 12;
  const start = (index - 1) * count;
  return {
    starts_on: `${year}-${String(start + 1).padStart(2, "0")}-01`,
    ends_on: new Date(Date.UTC(year, start + count, 0)).toISOString().slice(0, 10),
  };
}
export function objectiveProgress(
  id: string,
  objectives: readonly { id: string; parent_id: string | null }[],
  metrics: readonly {
    objective_id: string | null;
    initial_value: number;
    target_value: number;
    current_value: number;
  }[],
  seen = new Set<string>(),
): number {
  if (seen.has(id)) return 0;
  const next = new Set(seen).add(id);
  const values = [
    ...metrics
      .filter((m) => m.objective_id === id)
      .map((m) => metricProgress(m.initial_value, m.target_value, m.current_value)),
    ...objectives
      .filter((o) => o.parent_id === id)
      .map((o) => objectiveProgress(o.id, objectives, metrics, next)),
  ];
  return values.length
    ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10
    : 0;
}
export function checkinDue(last: string | undefined, today: Date) {
  return !last || today.getTime() - new Date(last).getTime() >= 7 * 86400000;
}
