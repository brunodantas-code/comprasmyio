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

export function competenceLines<T extends DatedLine>(lines: readonly T[], statements: readonly StatementPeriod[], cardId: string, statementId: string | undefined, competence: string): T[] {
  const cardStatements = new Set(statements.filter(statement => statement.card_id === cardId).map(statement => statement.id));
  return lines.filter(line => cardStatements.has(line.statement_id) && (
    competence === 'statement' ? line.statement_id === statementId : competence === 'all' || line.date.slice(0, 7) === competence
  )).sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
}