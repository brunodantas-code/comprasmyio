export type EnvironmentTypeRef = { id: string; discipline: string };

// Totaliza os ambientes da visita por disciplina do tipo de ambiente: hidráulica (hidrômetros) e elétrica (medições de energia).
export function environmentDisciplineTotals(rows: Array<{ environment_type_id?: string | null }>, types: EnvironmentTypeRef[]) {
  const disciplines = new Map(types.map((type) => [type.id, type.discipline]));
  const totals = { hydraulic: 0, electrical: 0 };
  for (const row of rows) {
    const discipline = row.environment_type_id ? disciplines.get(row.environment_type_id) : undefined;
    if (discipline === "hydraulic") totals.hydraulic += 1;
    else if (discipline === "electrical") totals.electrical += 1;
  }
  return totals;
}
