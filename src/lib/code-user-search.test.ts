import { describe, expect, it } from 'vitest';
import { filterCodeUsers } from './code-user-search';
const users = [{ value: 'a', label: 'Alexandre José', hint: 'alexandre@example.test' }, { value: 'b', label: 'Leonardo Roedel' }];
describe('Busca tolerante de destinatários do Code', () => {
  it('busca por nome sem acentos e palavras em outra ordem', () => {
    expect(filterCodeUsers(users, 'jose alexandre').map(o => o.value)).toEqual(['a']);
  });
  it('tolera um erro de digitação no nome', () => {
    expect(filterCodeUsers(users, 'Alexndre').map(o => o.value)).toEqual(['a']);
  });
  it('busca também pelo e-mail', () => {
    expect(filterCodeUsers(users, 'alexandre@example').map(o => o.value)).toEqual(['a']);
    expect(filterCodeUsers(users, 'inexistente')).toEqual([]);
  });
});