import { describe, expect, it } from 'vitest';
import { contentFieldWidth } from './field-content-width';

describe('largura pelo conteúdo', () => {
  it('usa a opção mais longa e reserva os controles, não a largura da página', () => {
    expect(contentFieldWidth(['Ana', 'Alexandre Ribeiro'], text => text.length * 8, 48)).toBe(184);
  });
  it('usa a maior linha do texto e não soma todas as linhas', () => {
    expect(contentFieldWidth(['Nome\nNome mais longo'], text => text.length * 7, 24)).toBe(129);
  });
});