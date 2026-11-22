import type { CentralItem } from './central-pending';

export function sortCentralPending(items: readonly CentralItem[], key: string, direction: 'asc' | 'desc', score: (item: CentralItem) => number) {
  const priorities: Record<string, number> = { baixa: 1, media: 2, alta: 3, critica: 4 };
  return [...items].sort((a, b) => {
    if (key === 'due' && (!a.due || !b.due)) return a.due ? -1 : b.due ? 1 : a.title.localeCompare(b.title, 'pt-BR');
    const value = key === 'critical' ? score(a) - score(b)
      : key === 'priority' ? (priorities[a.priority] ?? 0) - (priorities[b.priority] ?? 0)
      : key === 'due' ? (a.due ?? '').localeCompare(b.due ?? '')
      : key === 'app' ? a.app.localeCompare(b.app, 'pt-BR')
      : key === 'status' ? a.status.localeCompare(b.status, 'pt-BR')
      : a.title.localeCompare(b.title, 'pt-BR');
    return value * (direction === 'desc' ? -1 : 1) || a.title.localeCompare(b.title, 'pt-BR');
  });
}