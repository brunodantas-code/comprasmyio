import { importedField } from './indicadores-import';

type Objective = { id: string; responsible_id: string | null; source_metadata: unknown };
type Metric = { id: string; objective_id: string | null; responsible_id: string | null; source_metadata: unknown; kind: string };
export function indicadoresUserBars(objectives: readonly Objective[], metrics: readonly Metric[], users: readonly { id: string; full_name: string }[]) {
  const groups = new Map<string, { id: string; name: string; total: number; objectiveIds: Set<string>; metricIds: Set<string> }>();
  const group = (responsible: string | null, metadata: unknown) => {
    const name = users.find(u => u.id === responsible)?.full_name || importedField(metadata, 'responsible_name') || 'Sem responsável';
    const id = responsible || `historical:${name}`;
    const existing = groups.get(id);
    if (existing) return existing;
    const next = { id, name, total: 0, objectiveIds: new Set<string>(), metricIds: new Set<string>() };
    groups.set(id, next);
    return next;
  };
  for (const o of objectives) group(o.responsible_id, o.source_metadata).objectiveIds.add(o.id);
  for (const m of metrics) {
    const g = group(m.responsible_id, m.source_metadata);
    g.metricIds.add(m.id);
    if (m.objective_id && objectives.some(o => o.id === m.objective_id)) g.objectiveIds.add(m.objective_id);
  }
  return [...groups.values()].map(g => ({ ...g, total: g.objectiveIds.size + metrics.filter(m => g.metricIds.has(m.id) && m.kind === 'kpi').length })).sort((a,b) => b.total-a.total);
}