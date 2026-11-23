import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { DollarSign, ArrowRight } from 'lucide-react';
import type { Receipt } from './data';
import { availableReimbursements, reimbursementTotal } from './reimbursement';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { BRL, formatDate } from '@/components/cash-flow/shared';

export function ReimbursementDialog({ receipts, userId }: { receipts: Receipt[]; userId: string }) {
  const navigate = useNavigate();
  const available = availableReimbursements(receipts, userId);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const chosen = available.filter(r => selected.has(r.id));
  return <><Button variant="ghost" disabled={!available.length} title="Solicitar reembolso no Supply" aria-label="Solicitar reembolso no Supply" onClick={() => { setSelected(new Set(available.map(r => r.id))); setOpen(true); }}><DollarSign /><span>Solicitar reembolso</span></Button>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="sm:max-w-2xl" aria-describedby={undefined}><DialogHeader><DialogTitle>Solicitar reembolso no Supply</DialogTitle></DialogHeader>
      <label className="flex items-center gap-2 text-sm"><Checkbox aria-label="Selecionar todos os reembolsos" checked={chosen.length === available.length ? true : chosen.length ? 'indeterminate' : false} onCheckedChange={v => setSelected(new Set(v === true ? available.map(r => r.id) : []))} />Todos os reembolsos filtrados ({available.length})</label>
      <div className="max-h-[55dvh] overflow-y-auto divide-y divide-border">{available.map(r => <label key={r.id} className="flex items-center gap-3 py-2"><Checkbox aria-label={`Incluir reembolso de ${r.merchant}`} checked={selected.has(r.id)} onCheckedChange={v => setSelected(prev => { const next = new Set(prev); if (v === true) next.add(r.id); else next.delete(r.id); return next; })} /><span className="min-w-0 flex-1"><span className="block truncate text-sm" title={r.merchant}>{r.merchant}</span><span className="text-xs text-muted-foreground">{formatDate(r.date)}</span></span><strong className="shrink-0 text-sm tabular-nums">{BRL.format(r.amount)}</strong></label>)}</div>
      <div className="flex flex-wrap items-center justify-between gap-3"><strong className="tabular-nums">Total: {BRL.format(reimbursementTotal(chosen))}</strong><Button disabled={!chosen.length || chosen.length > 100} onClick={() => { setOpen(false); void navigate({ to: '/dashboard', search: { section: 'pedidos', subsection: 'new', spendReceipts: chosen.map(r => r.id).join(',') } }); }}><ArrowRight />Abrir solicitação ({chosen.length})</Button></div>
    </DialogContent></Dialog>
  </>;
}