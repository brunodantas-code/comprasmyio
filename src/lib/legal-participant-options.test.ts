import { describe, expect, it } from 'vitest';
import { legalParticipantOptions } from './legal-participant-options';

describe('Participantes das atas', () => {
  const users = [{ value: 'João Paulo Couto', label: 'João Paulo Couto' }];
  it('busca usuários sem exigir acentos ou ordem das palavras', () => {
    expect(legalParticipantOptions(users, 'couto joao')[0].value).toBe('João Paulo Couto');
  });
  it('permite adicionar uma pessoa que não é usuária do ERP', () => {
    expect(legalParticipantOptions(users, '  Maria Visitante  ')).toEqual([
      { value: 'Maria Visitante', label: 'Maria Visitante', hint: 'Adicionar participante externo' },
    ]);
  });
  it('não oferece inclusão externa para um nome já cadastrado', () => {
    expect(legalParticipantOptions(users, 'joao paulo couto')).toEqual(users);
  });
});