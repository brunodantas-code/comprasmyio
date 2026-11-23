type DepartmentObjective = {
  id: string;
  alignment_name: string | null;
  parent_id: string | null;
};

/** Resolve only the indicator's recorded alignment, never the viewer's department. */
export function indicatorDepartment(objectiveId: string | null, objectives: readonly DepartmentObjective[]): string {
  const seen = new Set<string>();
  let id = objectiveId;
  while (id && !seen.has(id)) {
    seen.add(id);
    const objective = objectives.find(row => row.id === id);
    if (!objective) break;
    const department = objective.alignment_name?.trim();
    if (department) return department;
    id = objective.parent_id;
  }
  return "Sem departamento/setor";
}