import { describe, expect, it } from 'vitest';
import { mobileMenuNeedsPaging, mobileMenuPage } from './mobile-menu-pages';

describe('menu flutuante no celular', () => {
  it('mantém os cinco menus à vista sem reticências', () => {
    expect(mobileMenuNeedsPaging(5)).toBe(false);
  });
  it('substitui a quinta posição por reticências quando houver sexto menu', () => {
    expect(mobileMenuNeedsPaging(6)).toBe(true);
    expect(mobileMenuPage(6, 0).end).toBe(4);
  });
  it('mostra quatro menus de sete sem comprimir os demais', () => {
    expect(mobileMenuPage(7, 0)).toEqual({ start: 0, end: 4, next: 1, last: false });
  });
  it('alcança os menus ocultos e permite retornar aos primeiros', () => {
    expect(mobileMenuPage(7, 1)).toEqual({ start: 4, end: 7, next: 0, last: true });
  });
  it('alcança todos os grupos em apps com mais de oito menus', () => {
    expect(mobileMenuPage(10, 2)).toEqual({ start: 8, end: 10, next: 0, last: true });
  });
});