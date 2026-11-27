import type { TableReport } from './table-report';

function cellText(cell: Element): string {
  const clone = cell.cloneNode(true) as Element;
  clone.querySelectorAll('svg,[role="tooltip"],[hidden],.sr-only,button:has(svg),[role="checkbox"]').forEach(node => node.remove());
  const originals = Array.from(cell.querySelectorAll('input,textarea,select'));
  clone.querySelectorAll('input,textarea,select').forEach((node, index) => {
    const original = originals[index];
    const value = original instanceof HTMLInputElement || original instanceof HTMLTextAreaElement || original instanceof HTMLSelectElement ? original.value : node.getAttribute('value') ?? '';
    node.replaceWith(value);
  });
  clone.querySelectorAll('p,div').forEach(node => node.append(' '));
  return (clone.textContent ?? '').replace(/\s+/g, ' ').trim();
}

/** Export only rendered source rows: filtering/order/access are already applied by the screen. */
export function renderedTableReport(table: HTMLTableElement): TableReport {
  const head = table.tHead?.rows[0];
  if (!head) return { columns: [], rows: [] };
  const headers = Array.from(head.cells).map(cellText);
  const indices = headers.flatMap((label, index) => label && !/^(ações|selecionar)$/i.test(label) ? [index] : []);
  const rows = Array.from(table.tBodies).flatMap(body => Array.from(body.rows))
    .filter(row => !row.hidden && row.cells.length === headers.length && !Array.from(row.cells).some(cell => cell.colSpan > 1))
    .map(row => indices.map(index => { const cell = row.cells[index]; return cell ? cellText(cell) : ''; }));
  return { columns: indices.map(index => headers[index] ?? ''), rows };
}