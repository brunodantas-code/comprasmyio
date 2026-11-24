type StatementPeriod = { id: string; card_id: string; period: string; due_date: string | null };
type DatedLine = { statement_id: string; date: string; id: string };

export function statementMonth(statement: StatementPeriod) {
  return (statement.due_date || statement.period).slice(0, 7);
}

export function monthOptions(values: readonly string[]) {
  return [...new Set(values.map(value => value.slice(0, 7)).filter(value => /^\d{4}-(0[1-9]|1[0-2])$/.test(value)))]
    .sort((a, b) => b.localeCompare(a))
    .map(value => ({ value, label: `${value.slice(5, 7)}/${value.slice(0, 4)}` }));
}

export const MONTH_NAMES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

const PERIOD = /^\d{4}-(0[1-9]|1[0-2])$/;

/** Two independent droplists (month, year) replace one "MM/AAAA" field, so the stored period is split and rejoined here. */
export function monthOf(period: string) {
  return PERIOD.test(period) ? period.slice(5, 7) : "";
}

export function yearOf(period: string) {
  return PERIOD.test(period) ? period.slice(0, 4) : "";
}

export function monthSelectOptions() {
  return MONTH_NAMES.map((name, index) => ({ value: String(index + 1).padStart(2, "0"), label: name }));
}

export function yearSelectOptions(values: readonly string[], centerYear: number) {
  const years = new Set(values.map(value => value.slice(0, 4)).filter(value => /^\d{4}$/.test(value)));
  [centerYear - 1, centerYear, centerYear + 1].forEach(year => years.add(String(year)));
  return [...years].sort((a, b) => b.localeCompare(a)).map(value => ({ value, label: value }));
}

export function competenceLines<T extends DatedLine>(lines: readonly T[], statements: readonly StatementPeriod[], cardId: string, statementId: string | undefined, competence: string): T[] {
  const cardStatements = new Set(statements.filter(statement => statement.card_id === cardId).map(statement => statement.id));
  return lines.filter(line => cardStatements.has(line.statement_id) && (
    competence === 'statement' ? line.statement_id === statementId : competence === 'all' || line.date.slice(0, 7) === competence
  )).sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
}