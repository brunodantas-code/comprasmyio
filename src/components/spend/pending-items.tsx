import { Link } from '@tanstack/react-router';
import { MessageSquareWarning } from 'lucide-react';
import { PendingRowContent, type PendingGroupItem } from '@/components/pending-groups';
import { BRL } from '@/components/cash-flow/shared';
import { AdvanceIcon } from './icons';
import type { SpendAdjustment, SpendAdvancePending } from './pending';
export function spendPendingItems(items: readonly SpendAdjustment[]): PendingGroupItem[] {
  return items.map(item => ({ key:`spend-${item.line_id}`, app:'Spend', requester:item.requester_name ?? 'Financeiro', count:1,
    row:<Link to="/spend" search={{adjustment:item.line_id}} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-primary/10"><PendingRowContent icon={MessageSquareWarning} destructive label={`${item.kind==='notify'?'Comprovante solicitado':'Ajuste solicitado'} · ${item.merchant} · ${BRL.format(item.amount)} · ${item.message}`} /></Link>,
  }));
}
export function spendAdvancePendingItems(items: readonly SpendAdvancePending[]): PendingGroupItem[] {
  return items.map(item => ({ key:`spend-advance-${item.advance_id}`, app:'Spend', requester:item.requester_name ?? 'Financeiro', count:1,
    row:<Link to="/spend" search={{advance:item.advance_id}} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-primary/10"><PendingRowContent icon={AdvanceIcon} destructive label={`Prestação de contas vencida · ${item.purpose || 'Adiantamento'} · saldo ${BRL.format(item.remaining)} · prazo ${item.due_at.split('-').reverse().join('/')}`} /></Link>,
  }));
}