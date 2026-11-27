import { describe, expect, it } from 'vitest';
import { lineDetails } from './line-details';

describe('edição da descrição da fatura', () => {
  const line = { id: 'line-1', merchant: 'DgraziKart' };
  const revision = { id: 'rev-1', created_at: '2026-11-27T20:34:00Z', action: 'line_description_edited', details: { line_id: 'line-1', description: 'Restaurante DgraziKart', observation: 'Almoço durante visita ao cliente' } };
  it('exibe a edição sem substituir a descrição original', () => {
    expect(lineDetails(line, [revision]).display_description).toBe('Restaurante DgraziKart');
    expect(line.merchant).toBe('DgraziKart');
  });
  it('mantém a observação opcional vinculada somente ao lançamento editado', () => {
    expect(lineDetails(line, [revision]).additional_observation).toBe('Almoço durante visita ao cliente');
    expect(lineDetails({ id: 'line-2', merchant: 'Outro' }, [revision]).additional_observation).toBe('');
  });
  it('recupera a última revisão e permite retirar a observação', () => {
    const newer = { ...revision, id: 'rev-2', created_at: '2026-11-27T20:35:00Z', details: { ...revision.details, description: 'Restaurante', observation: '' } };
    expect(lineDetails(line, [revision, newer])).toEqual({ display_description: 'Restaurante', additional_observation: '', description_revision: 'rev-2' });
  });
  it('preserva os lançamentos sem edição', () => {
    expect(lineDetails(line, [])).toEqual({ display_description: 'DgraziKart', additional_observation: '', description_revision: null });
  });
});