import type { PersonalTodo } from './personal-todos';

export const TODO_SORT_MODES = { manual: 'Minha ordem', due: 'Vencimento: mais próximo', priority: 'Prioridade: maior primeiro', title: 'Título: A–Z', newest: 'Criação: mais recentes', oldest: 'Criação: mais antigas', status: 'Situação' };
export type TodoSortMode = keyof typeof TODO_SORT_MODES;
export function isTodoSortMode(value: string): value is TodoSortMode { return Object.hasOwn(TODO_SORT_MODES, value); }
const priorities: Record<string, number> = { critica: 0, alta: 1, media: 2, baixa: 3 };
export function sortTodos(tasks: PersonalTodo[], mode: TodoSortMode, ids: string[] = []) {
  const position = new Map(ids.map((id, i) => [id, i]));
  return [...tasks].sort((a, b) => {
    if (mode === 'manual') return (position.get(a.id) ?? ids.length) - (position.get(b.id) ?? ids.length);
    if (mode === 'due') return (a.due_date ?? '9999-12-31').localeCompare(b.due_date ?? '9999-12-31');
    if (mode === 'priority') return (priorities[a.priority] ?? 4) - (priorities[b.priority] ?? 4);
    if (mode === 'title') return a.title.localeCompare(b.title, 'pt-BR');
    if (mode === 'status') return a.status.localeCompare(b.status);
    return mode === 'oldest' ? a.created_at.localeCompare(b.created_at) : b.created_at.localeCompare(a.created_at);
  });
}
export function mergeVisibleTodoOrder(allIds: string[], visibleIds: string[]) {
  const visible = new Set(visibleIds);
  let i = 0;
  return allIds.map(id => visible.has(id) ? visibleIds[i++] : id);
}