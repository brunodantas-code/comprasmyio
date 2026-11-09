import { describe, expect, it } from 'vitest';
import { detectButtonGroup } from './cde-look';

describe('Approval action standard grouping', () => {
  for (const label of ['Agrupar por Projeto e Cliente', 'Consolidar itens', 'Custo por Etiqueta', 'Indicadores de prazos']) {
    it(`resolves ${label} to the shared action group`, () => {
      expect(detectButtonGroup(label)).toBe('organize');
    });
  }
});