/** Compact only shallow field rows, never content sections or multiline editors. */
export function compactFieldRows(field: HTMLElement) {
  field.dataset['compactField'] = 'true';
  if (field.closest('table')) return;
  let row = field.parentElement;
  for (let depth = 0; row && depth < 4; depth++, row = row.parentElement) {
    if (row.matches('form,section,article,table,[role="dialog"]')) break;
    const style = getComputedStyle(row);
    if (!['grid', 'flex'].includes(style.display)) continue;
    const children = Array.from(row.children).filter((child): child is HTMLElement => child instanceof HTMLElement && getComputedStyle(child).display !== 'none');
    if (children.length < 2 || children.length > 8) continue;
    if (row.querySelector('textarea,table,h1,h2,h3,h4,[role="radiogroup"],[role="tablist"],img')) continue;
    const fieldBranches = children.filter(child => child.matches('[data-compact-field]') || child.querySelector('[data-compact-field]'));
    const hasToolbar = children.some(child => child.matches('.erp-list-toolbar'));
    if (fieldBranches.length < (hasToolbar ? 1 : 2)) continue;
    if (children.some(child => !fieldBranches.includes(child) && !child.matches('button,[data-cde-action],.erp-list-toolbar'))) continue;
    if (children.some(child => child.querySelectorAll('[data-compact-field]').length > 2)) continue;
    if (hasToolbar && style.display === 'flex' && style.flexDirection === 'row') row.classList.add('erp-list-controls-row');
    for (const child of fieldBranches) {
      child.style.setProperty('min-width', '0');
      child.style.setProperty('max-width', '100%');
      const childStyle = getComputedStyle(child);
      if (childStyle.display === 'grid' && childStyle.gridTemplateColumns.split(/\s+/).length === 1) {
        child.style.setProperty('grid-template-columns', 'minmax(0, 1fr)');
      }
    }
    if (style.display === 'grid') {
      // Read the responsive track count before overriding geometry.
      row.style.removeProperty('grid-template-columns');
      const tracks = getComputedStyle(row).gridTemplateColumns.split(/\s+(?![^()]*\))/).length;
      row.style.setProperty('grid-template-columns', `repeat(${tracks}, minmax(0, max-content))`);
      row.style.setProperty('justify-content', 'start');
      if (tracks > 1 && row.scrollWidth > row.clientWidth + 1) {
        row.style.setProperty('grid-template-columns', 'minmax(0, max-content)');
      }
    } else if (style.flexDirection === 'row') {
      row.style.setProperty('justify-content', 'flex-start');
      row.style.setProperty('flex-wrap', 'wrap');
      for (const child of fieldBranches) {
        child.style.setProperty('flex', '0 1 auto');
        child.style.setProperty('width', 'max-content');
        child.style.setProperty('max-width', '100%');
      }
    }
  }
}