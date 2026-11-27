import { describe, expect, it } from 'vitest';
import { detectButtonGroup } from './cde-look';

describe('Save icon standard grouping', () => {
  it('recognizes an icon-only save by its accessible label', () => {
    expect(detectButtonGroup(null, 'Salvar seção')).toBe('save');
  });
});

describe('Approval action standard grouping', () => {
  for (const label of ['Agrupar por Projeto e Cliente', 'Consolidar itens', 'Custo por Etiqueta', 'Indicadores de prazos']) {
    it(`resolves ${label} to the shared action group`, () => {
      expect(detectButtonGroup(label)).toBe('organize');
    });
  }
});

describe('Icon-only object names', () => {
  it('keeps a descriptive object on the trash standard', () => {
    expect(detectButtonGroup(null, 'Excluir o indicador de vendas')).toBe('trash');
  });
  it('ignores action words inside an object name', () => {
    expect(detectButtonGroup(null, 'Histórico de Concluir a migração')).toBeUndefined();
    expect(detectButtonGroup(null, 'Check-in de Criar nova loja')).toBeUndefined();
  });
  it('still exports on a file-format noun', () => {
    expect(detectButtonGroup(null, 'Baixar PDF respondido')).toBe('export');
  });
});