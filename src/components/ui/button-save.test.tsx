import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { Check, Percent } from 'lucide-react';

vi.mock('@/components/cde/cde-button', () => ({
  useCdeStandards: () => ({ data: undefined }),
  resolveCdeModel: () => ({}),
}));
import { Button } from './button';

describe('shared Save content', () => {
  for (const [label, Icon] of [['Salvar perfil', Check], ['Salvar perda', Percent]] as const) {
    it(`normalizes ${label} to disk and Salvar`, () => {
      const html = renderToStaticMarkup(<Button><Icon />{label}</Button>);
      expect(html).toContain('lucide-save');
      expect(html).toContain('Salvar');
      expect(html).not.toContain(label);
    });
  }
  it('preserves unrelated actions', () => {
    const html = renderToStaticMarkup(<Button>Enviar proposta</Button>);
    expect(html).toContain('Enviar proposta');
    expect(html).not.toContain('lucide-save');
  });
});