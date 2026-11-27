import { useLayoutEffect, type RefObject } from 'react';
import { compactFieldRows } from './compact-field-layout';

export function contentFieldWidth(texts: readonly string[], measure: (text: string) => number, controls: number): number {
  return Math.ceil(Math.max(0, ...texts.flatMap(text => text.split('\n').map(measure))) + controls);
}

/** Geometry only: preserve the live CDE font, underline, height and actions. */
export function useFieldContentWidth<T extends HTMLElement>(ref: RefObject<T | null>, texts: readonly string[] = [], inputRef?: RefObject<HTMLInputElement | null>) {
  useLayoutEffect(() => {
    const field = ref.current;
    if (!field) return;
    // Boxed access forms keep their original full-width geometry.
    if (field.closest('[data-full-width-fields]')) return;
    if (field instanceof HTMLTextAreaElement) return;
    if (field instanceof HTMLInputElement && ['hidden', 'file', 'checkbox', 'radio', 'range', 'color'].includes(field.type)) return;
    const input = inputRef?.current ?? field;
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) return;
    let layoutFrame = 0;
    const update = () => {
      const font = getComputedStyle(input);
      context.font = `${font.fontStyle} ${font.fontWeight} ${font.fontSize} ${font.fontFamily}`;
      const native = field instanceof HTMLInputElement;
      const values = native ? [field.value || field.placeholder || (field instanceof HTMLInputElement && field.type === 'number' ? '0' : '          ')] : texts;
      const valueTexts = field instanceof HTMLInputElement && field.type === 'password' ? values.map(text => '•'.repeat(text.length)) : values;
      const own = getComputedStyle(field);
      const px = (value: string) => Number.parseFloat(value) || 0;
      const padding = px(own.paddingLeft) + px(own.paddingRight) + px(own.borderLeftWidth) + px(own.borderRightWidth);
      const controls = native ? (field instanceof HTMLInputElement && ['date', 'month', 'time', 'number'].includes(field.type) ? 28 : 2) : 48 + px(font.paddingLeft) + px(font.paddingRight);
      const width = contentFieldWidth(valueTexts, text => context.measureText(text).width, padding + controls);
      field.style.setProperty('width', `${Math.max(width, controls + padding)}px`, 'important');
      field.style.setProperty('max-width', '100%', 'important');
      field.style.setProperty('min-width', '0', 'important');
      field.style.setProperty('flex-grow', '0', 'important');
      if (field.parentElement?.hasAttribute('data-password-field')) {
        field.parentElement.style.setProperty('width', field.style.width);
        field.parentElement.style.setProperty('max-width', '100%');
      }
      cancelAnimationFrame(layoutFrame);
      layoutFrame = requestAnimationFrame(() => compactFieldRows(field));
    };
    update();
    field.addEventListener('input', update);
    window.addEventListener('resize', update);
    let active = true;
    void document.fonts.ready.then(() => { if (active) update(); });
    return () => { active = false; cancelAnimationFrame(layoutFrame); field.removeEventListener('input', update); window.removeEventListener('resize', update); };
  });
}