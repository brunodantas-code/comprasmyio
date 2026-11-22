import { describe, expect, it } from 'vitest';
import { sortCentralPending } from './central-pending-order';
import type { CentralItem } from './central-pending';
const item = (app: string, title: string): CentralItem => ({ app, title, key: title, kind: 'code', sourceId: title, route: '', recordId: title, status: 'aberto', completed: false, canceled: false, due: null, priority: 'media', users: ['user'], reasons: {} });
describe('ordenação das pendências compartilhada pela lista e gráfico', () => {
  const items = [item('Supply', 'Compra'), item('Code', 'Correção'), item('Legal', 'Ata')];
  it('ordena por App de A a Z', () => {
    expect(sortCentralPending(items, 'app', 'asc', () => 1).map(i => i.app)).toEqual(['Code', 'Legal', 'Supply']);
  });
  it('ordena por App de Z a A sem alterar a origem', () => {
    expect(sortCentralPending(items, 'app', 'desc', () => 1).map(i => i.app)).toEqual(['Supply', 'Legal', 'Code']);
    expect(items.map(i => i.app)).toEqual(['Supply', 'Code', 'Legal']);
  });
});