import { useState, type ReactNode } from 'react';
import { BarChart3 } from 'lucide-react';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, LabelList } from 'recharts';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CdeDisclosureIcon } from '@/components/cde/cde-button';
import { centralUserBars, type UserBar } from '@/lib/central-user-bars';

export type { UserBar } from '@/lib/central-user-bars';

export function UserPendingBars({ data, renderDetails }: { data: UserBar[]; renderDetails: (id: string) => ReactNode }) {
  const [open, setOpen] = useState(false);
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  if (!data.length) return null;
  const { all: sorted, summary } = centralUserBars(data);
  const maximum = Math.max(1, ...sorted.map(user => user.total));
  const toggleUser = (id: string) => setExpandedUsers(previous => {
    const next = new Set(previous);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  return <>
    <Button variant="ghost" type="button" onClick={() => setOpen(true)} title="Expandir gráfico de pendências por usuário" aria-label="Expandir gráfico de pendências por usuário" className="!flex !h-20 !w-80 !max-w-full !bg-transparent items-end gap-2 px-1 py-0 text-left">
      <div className="h-full min-w-0 flex-1"><ResponsiveContainer width="100%" height="100%"><BarChart data={summary} layout="vertical" margin={{ top: 2, right: 20, bottom: 2, left: 0 }}><XAxis type="number" hide /><YAxis type="category" dataKey="name" width={132} axisLine={false} tickLine={false} interval={0} tick={{ fontSize: 10, fill: 'var(--foreground)' }} /><Tooltip cursor={false} formatter={(v) => [v, 'Pendências']} /><Bar dataKey="total" barSize={12} fill="var(--primary)" radius={[0, 2, 2, 0]} isAnimationActive={false}><LabelList dataKey="total" position="right" fontSize={10} fill="var(--foreground)" /></Bar></BarChart></ResponsiveContainer></div>
      <BarChart3 className="h-4 w-4 shrink-0 text-foreground" />
    </Button>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-w-3xl"><DialogHeader><DialogTitle>Pendências por usuário</DialogTitle></DialogHeader>
      <div className="min-w-0 space-y-2">
        {sorted.map(user => {
          const expanded = expandedUsers.has(user.id);
          return <section key={user.id} className="min-w-0">
            <Button variant="ghost" type="button" aria-label={`Detalhar pendências de ${user.name}`} aria-expanded={expanded} aria-controls={`chart-pending-${user.id}`} title={expanded ? 'Recolher pendências' : 'Exibir pendências'} onClick={() => toggleUser(user.id)} className="!grid !h-auto !w-full !max-w-none !bg-transparent !justify-start grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-0 py-1 text-left sm:grid-cols-[200px_minmax(0,1fr)_auto]">
              <span className="min-w-0 whitespace-normal break-words text-sm text-muted-foreground sm:text-right">{user.name}</span>
              <span className="col-span-2 row-start-2 flex min-w-0 items-center gap-2 sm:col-span-1 sm:col-start-2 sm:row-start-1">
                <span className="block min-w-0 flex-1"><span className="block h-8 rounded-sm bg-primary" style={{ width: `${user.total / maximum * 100}%` }} /></span>
                <span className="w-8 shrink-0 text-sm tabular-nums text-muted-foreground">{user.total}</span>
              </span>
              <span className="col-start-2 row-start-1 shrink-0 sm:col-start-3"><CdeDisclosureIcon open={expanded} screen="components/central/dashboard.tsx" /></span>
            </Button>
            {expanded && <div id={`chart-pending-${user.id}`} className="min-w-0">{renderDetails(user.id)}</div>}
          </section>;
        })}
      </div>
    </DialogContent></Dialog>
  </>;
}