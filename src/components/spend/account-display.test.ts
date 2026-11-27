import { expect, it } from 'vitest';
import { spendAccountDisplay } from './account-display';
import { bulkClassificationPatch } from './classification';

it('código e nome identificam a mesma conta sem separar sua classificação no lote', () => {
  const account = spendAccountDisplay({ id: 'alimentacao', name: '4.1.02 · Alimentação' });
  expect(account).toEqual({ id: 'alimentacao', code: '4.1.02', name: 'Alimentação' });
  expect(bulkClassificationPatch(account.id, '', '')).toEqual({ account_id: 'alimentacao' });
});
it('preserva o nome completo depois do separador do código', () => {
  expect(spendAccountDisplay({ id: '1', name: '4.2 · Viagens · Hospedagem' }).name).toBe('Viagens · Hospedagem');
});