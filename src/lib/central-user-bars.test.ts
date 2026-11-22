import { describe, expect, it } from 'vitest';
import { centralUserBars } from './central-user-bars';

describe('resumo das pendências por usuário', () => {
  const users = [
    { id: 'bruno', name: 'Bruno', total: 12 },
    { id: 'joao', name: 'João Paulo Couto', total: 25 },
    { id: 'leandro', name: 'Leandro Gadioli Rodrigues', total: 9 },
    { id: 'leonardo', name: 'Leonardo Roedel', total: 14 },
    { id: 'rodrigo', name: 'Rodrigo Lago', total: 21 },
    { id: 'alexandre', name: 'Alexandre Ribeiro', total: 9 },
    { id: 'unassigned', name: 'Sem responsável', total: 2 },
  ];

  it('mostra somente os três usuários com mais pendências no resumo', () => {
    expect(centralUserBars(users).summary.map(user => [user.id, user.total])).toEqual([
      ['joao', 25], ['rodrigo', 21], ['leonardo', 14],
    ]);
  });

  it('preserva todos os usuários e suas pendências na visualização expandida', () => {
    const { all } = centralUserBars(users);
    expect(all).toHaveLength(7);
    expect(all.map(user => user.total)).toEqual([25, 21, 14, 12, 9, 9, 2]);
    expect(all).toEqual(expect.arrayContaining(users));
    expect(users[0]?.id).toBe('bruno');
  });

  it('não inventa usuários quando existem menos de três', () => {
    expect(centralUserBars([]).summary).toEqual([]);
    expect(centralUserBars(users.slice(0, 2)).summary.map(user => user.id)).toEqual(['joao', 'bruno']);
  });
});