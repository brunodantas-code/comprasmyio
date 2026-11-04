export type KpiFrequency = "semanal" | "mensal" | "trimestral" | "semestral" | "anual";
export const KPI_FREQUENCIES: { value: KpiFrequency; label: string }[] = [
  { value: "semanal", label: "Semanal" },
  { value: "mensal", label: "Mensal" },
  { value: "trimestral", label: "Trimestral" },
  { value: "semestral", label: "Semestral" },
  { value: "anual", label: "Anual" },
];

export type KpiStatus = "ok" | "atencao" | "critico" | "sem_dado";

/** Atingimento relativo à meta: >=100% verde, >=90% amarelo, abaixo vermelho. */
export function kpiStatus(value: number | null | undefined, target: number): KpiStatus {
  if (value === null || value === undefined || !Number.isFinite(value)) return "sem_dado";
  if (target === 0) return value >= 0 ? "ok" : "critico";
  const ratio = value / target;
  if (ratio >= 1) return "ok";
  if (ratio >= 0.9) return "atencao";
  return "critico";
}

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Início do período (data ISO) que contém a data informada. */
export function periodStart(date: Date, frequency: KpiFrequency): string {
  const y = date.getFullYear();
  const m = date.getMonth();
  if (frequency === "semanal") {
    const d = new Date(y, m, date.getDate());
    const shift = (d.getDay() + 6) % 7; // segunda-feira
    d.setDate(d.getDate() - shift);
    return iso(d);
  }
  if (frequency === "mensal") return iso(new Date(y, m, 1));
  if (frequency === "trimestral") return iso(new Date(y, Math.floor(m / 3) * 3, 1));
  if (frequency === "semestral") return iso(new Date(y, m < 6 ? 0 : 6, 1));
  return iso(new Date(y, 0, 1));
}

export function periodLabel(start: string, frequency: KpiFrequency): string {
  const [y, m, d] = start.split("-").map(Number);
  if (frequency === "semanal") return `Sem. ${pad(d)}/${pad(m)}/${String(y).slice(2)}`;
  if (frequency === "mensal") return `${pad(m)}/${y}`;
  if (frequency === "trimestral") return `${Math.floor((m - 1) / 3) + 1}º tri/${y}`;
  if (frequency === "semestral") return `${m <= 6 ? 1 : 2}º sem/${y}`;
  return String(y);
}
