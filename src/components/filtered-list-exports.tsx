import { useEffect, useRef, useState } from 'react';
import { TableReportActions } from './table-report-actions';
import type { TableReport } from '@/lib/table-report';

/** Non-table lists use the same authorized filter rows, never hidden records. */
export function FilteredListExports({ report }: { report: TableReport }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [title, setTitle] = useState('Lista');
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    const element = ref.current;
    if (!element || element.closest('[role="dialog"] [role="dialog"]')) return;
    const toolbar = element.closest('.erp-list-toolbar,.erp-list-tools-header');
    if (!toolbar) return;
    if (toolbar.querySelector('[data-auto-table-export]')) return;
    let scope = toolbar.parentElement;
    for (let depth = 0; scope && depth < 4; depth++, scope = scope.parentElement) {
      if (scope.querySelector('table')) return;
      const heading = scope.querySelector('h1,h2,h3,.cde-title');
      if (heading) {
        const actions = Array.from(toolbar.querySelectorAll('button,a')).filter(node => !element.contains(node));
        if (actions.some(node => /PDF|Excel|xlsx/i.test(`${node.getAttribute('aria-label')} ${node.getAttribute('title')} ${node.textContent}`))) return;
        element.dataset['filteredListExport'] = 'true';
        setTitle(heading.textContent?.trim() || 'Lista'); setEnabled(true);
        return () => { delete element.dataset['filteredListExport']; };
      }
    }
  }, []);
  return <span ref={ref} className="inline-flex shrink-0">{enabled && <TableReportActions title={title} report={report} iconOnly />}</span>;
}