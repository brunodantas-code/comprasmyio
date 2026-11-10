import { expect, it } from 'vitest';
import { sortTodos, mergeVisibleTodoOrder } from './todo-order';
import type { PersonalTodo } from './personal-todos';
const tasks = [
  { id: 'a', title: 'Zebra', priority: 'baixa', due_date: null, created_at: '2026-11-10' },
  { id: 'b', title: 'Abelha', priority: 'critica', due_date: '2026-11-15', created_at: '2026-11-09' },
  { id: 'c', title: 'Casa', priority: 'alta', due_date: '2026-11-11', created_at: '2026-11-08' },
] as PersonalTodo[];
it('orders by personal drag positions', () => expect(sortTodos(tasks, 'manual', ['c','a','b']).map(t=>t.id)).toEqual(['c','a','b']));
it('orders earliest deadline first and undated last', () => expect(sortTodos(tasks, 'due').map(t=>t.id)).toEqual(['c','b','a']));
it('orders critical and high priority ahead of low', () => expect(sortTodos(tasks, 'priority').map(t=>t.id)).toEqual(['b','c','a']));
it('orders titles alphabetically', () => expect(sortTodos(tasks, 'title').map(t=>t.id)).toEqual(['b','c','a']));
it('orders by creation date in both directions', () => { expect(sortTodos(tasks,'newest').map(t=>t.id)).toEqual(['a','b','c']); expect(sortTodos(tasks,'oldest').map(t=>t.id)).toEqual(['c','b','a']); });
it('keeps filtered-out tasks in their positions', () => expect(mergeVisibleTodoOrder(['a','hidden','b'], ['b','a'])).toEqual(['b','hidden','a']));