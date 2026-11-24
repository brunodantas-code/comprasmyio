import { Link } from '@tanstack/react-router';
import { MessageSquareWarning } from 'lucide-react';
import { PendingRowContent, type PendingGroupItem } from '@/components/pending-groups';
import { BRL } from '@/components/cash-flow/shared';
import type { SpendAdjustment } from './pending';
export function spendPendingItems(items: readonly SpendAdjustment[]): PendingGroupItem[] {
  return items.map(item => ({ key:`spend-${item.line_id}`, app:'Spend', requester:item.requester_name ?? 'Financeiro', count:1,
    row:<Link to="/spend" search={{adjustment:item.line_id}} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-primary/10"><PendingRowContent icon={MessageSquareWarning} destructive label={`Ajuste solicitado · ${item.merchant} · ${BRL.format(item.amount)} · ${item.message}`} /></Link>,
  }));
}