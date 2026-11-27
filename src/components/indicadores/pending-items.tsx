import { Link } from '@tanstack/react-router';
import { Target } from 'lucide-react';
import { PendingRowContent, type PendingGroupItem } from '@/components/pending-groups';
import { indicadoresPendingReason, type IndicadoresPendingKr } from './pending';
export function indicadoresPendingItems(items: readonly IndicadoresPendingKr[]): PendingGroupItem[] {
  return items.map(item => ({ key:`indicadores-${item.metric_id}`, app:'OKRs e KPIs', requester:'OKRs e KPIs', count:1,
    row:<Link to="/indicadores" className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-primary/10"><PendingRowContent icon={Target} destructive={item.overdue} label={`${indicadoresPendingReason(item)} · ${item.title}${item.due_on?` · prazo ${item.due_on.split('-').reverse().join('/')}`:''}`} /></Link>,
  }));
}
