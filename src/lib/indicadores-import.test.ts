import { describe, expect, it } from 'vitest';
import { historicalAuthor, importedField } from './indicadores-import';
describe('histórico OKR importado', () => {
  it('não atribui autoria ausente ao responsável ou importador', () => {
    expect(historicalAuthor(null, () => 'Leonardo')).toBe('Autor não informado na origem');
    expect(historicalAuthor('bruno', () => 'Bruno')).toBe('Bruno');
  });
  it('preserva meta zero e responsáveis compartilhados nos dados originais', () => {
    expect(importedField({ target: 0 }, 'target')).toBe('0');
    expect(importedField({ owner: 'Alexandre e JP' }, 'owner')).toBe('Alexandre e JP');
  });
});