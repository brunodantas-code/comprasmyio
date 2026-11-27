import { useEffect, useState, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { FileText, FileSpreadsheet, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { renderedTableReport } from '@/lib/rendered-table-report';

export function TableAutoExports({ tableRef }: { tableRef: RefObject<HTMLTableElement | null> }) {
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  const [title, setTitle] = useState('Lista');
  const [formats, setFormats] = useState<('pdf' | 'xlsx')[]>([]);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const table = tableRef.current;
    if (!table?.tHead || table.closest('[data-table-export="manual"]')) return;
    let container = table.parentElement?.parentElement;
    let toolbar: HTMLElement | null = null;
    for (let depth = 0; container && depth < 5; depth++, container = container.parentElement) {
      toolbar = container.querySelector<HTMLElement>('.erp-list-toolbar,.erp-list-tools-header');
      if (toolbar) break;
      if (container.matches('main,[role="dialog"]')) break;
    }
    if (!container || !toolbar || toolbar.querySelector('[data-auto-table-export],[data-filtered-list-export],[data-table-report-actions]')) return;
    const actions = Array.from(toolbar.querySelectorAll('button,a')).map(el => `${el.getAttribute('aria-label') ?? ''} ${el.getAttribute('title') ?? ''} ${el.textContent ?? ''}`);
    const missing: ('pdf' | 'xlsx')[] = [];
    if (!actions.some(text => /pdf/i.test(text))) missing.push('pdf');
    if (!actions.some(text => /excel|xlsx/i.test(text))) missing.push('xlsx');
    if (!missing.length) return;
    const titleContainer = container.matches('[data-card-content]') ? container.parentElement ?? container : container;
    const name = titleContainer.querySelector('h1,h2,h3,[data-card-title],.cde-title')?.textContent?.trim() || table.getAttribute('aria-label') || 'Lista';
    const target = document.createElement('span');
    target.dataset['autoTableExport'] = 'true';
    target.className = 'inline-flex shrink-0 items-center gap-1';
    toolbar.append(target);
    setTitle(name); setFormats(missing); setSlot(target);
    return () => target.remove();
  }, [tableRef]);
  async function download(format: 'pdf' | 'xlsx') {
    const table = tableRef.current;
    if (!table) return;
    const report = renderedTableReport(table);
    if (!report.rows.length) { toast.info('Nenhum registro para exportar.'); return; }
    setBusy(true);
    try {
      const { exportTableReport } = await import('@/lib/table-report-download');
      await exportTableReport(title, report, format);
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Não foi possível exportar a lista.'); }
    finally { setBusy(false); }
  }
  return slot ? createPortal(formats.map(format => <Button key={format} type="button" variant="ghost" size="icon" title={`Exportar ${title} em ${format === 'pdf' ? 'PDF' : 'Excel'}`} aria-label={`Exportar ${title} em ${format === 'pdf' ? 'PDF' : 'Excel'}`} disabled={busy} onClick={() => void download(format)}>{busy ? <Loader2 className="size-4 animate-spin" /> : format === 'pdf' ? <FileText /> : <FileSpreadsheet />}</Button>), slot) : null;
}