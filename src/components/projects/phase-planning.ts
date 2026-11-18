type Period = { planned_start: string | null; planned_end: string | null };
export function validatePeriod(start?: string | null, end?: string | null) {
  if (start && end && end < start) throw new Error("O fim previsto não pode anteceder o início previsto.");
}
export function phaseComparison(phase: Period, project: {start_date: string; planned_end: string | null}, tasks: {start: string; end: string}[]) {
  const warnings: string[] = [];
  const start = phase.planned_start;
  const end = phase.planned_end;
  if (phase.planned_start && phase.planned_start < project.start_date) warnings.push("Fase inicia antes do projeto");
  if (phase.planned_end && project.planned_end && phase.planned_end > project.planned_end) warnings.push("Fase termina após o projeto");
  if (start && tasks.some(t=>t.start < start)) warnings.push("Tarefas iniciam antes da fase");
  if (end && tasks.some(t=>t.end > end)) warnings.push("Tarefas ultrapassam o fim da fase");
  return warnings;
}