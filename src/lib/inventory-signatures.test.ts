import { describe, expect, it } from 'vitest';
import { pendingInventorySignatures } from './inventory-signatures';
describe('assinaturas do inventário', () => {
  const pending = { inventory_id: 'inventario', user_id: 'usuario', signed_at: null };
  it('gera pendência ao inventariante ERP sem assinatura', () => expect(pendingInventorySignatures([pending], 'usuario')).toEqual([pending]));
  it('retira a pendência após assinar', () => expect(pendingInventorySignatures([{ ...pending, signed_at: '2026-11-19T19:39:00Z' }], 'usuario')).toEqual([]));
  it('não gera pendência para outra pessoa nem nome externo', () => expect(pendingInventorySignatures([pending], 'externo')).toEqual([]));
});