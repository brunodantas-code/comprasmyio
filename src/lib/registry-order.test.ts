import { describe, expect, it } from 'vitest';
import { sequentialRegistryOrder } from './registry-order';

describe('ordenação dos cadastros de Diversos', () => {
  it('numera a ordem arrastada sequencialmente desde 1 preservando identidades', () => {
    expect(sequentialRegistryOrder([{ code: 'b', position: 40 }, { code: 'a', position: 10 }])).toEqual([{ code: 'b', position: 1 }, { code: 'a', position: 2 }]);
  });
});