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
    it(`uses the disk while preserving ${label}`, () => {
      const html = renderToStaticMarkup(<Button><Icon />{label}</Button>);
      expect(html).toContain('lucide-save');
      expect(html).toContain(label);
    });
  }
  for (const label of ['Excluir visita e manter chamados', 'Excluir visita e chamados', 'Excluir visita', 'Excluindo...', 'Salvando...', 'Salvar solução', 'Salvar andamento', 'Salvar PDF']) {
    it(`preserves the action scope or progress state: ${label}`, () => {
      const html = renderToStaticMarkup(<Button>{label}</Button>);
      expect(html).toContain(label);
    });
  }
  it('preserves unrelated actions', () => {
    const html = renderToStaticMarkup(<Button>Enviar proposta</Button>);
    expect(html).toContain('Enviar proposta');
    expect(html).not.toContain('lucide-save');
  });
});