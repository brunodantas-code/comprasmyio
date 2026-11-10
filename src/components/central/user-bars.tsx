import { useState } from 'react';
import { BarChart3 } from 'lucide-react';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, LabelList } from 'recharts';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export type UserBar = { name: string; total: number };

export function UserPendingBars({ data }: { data: UserBar[] }) {
  const [open, setOpen] = useState(false);
  if (!data.length) return null;
  const sorted = [...data].sort((a, b) => b.total - a.total).map(d => ({ ...d, initials: d.name.split(/\s+/).filter(w => w.length > 2 || /^[A-ZÀ-Ý]/.test(w)).filter(w => !/^(da|de|do|das|dos|e)$/i.test(w)).map(w => w[0]?.toUpperCase()).filter(Boolean).slice(0, 2).join('') || '?' }));
  return <>
    <button type="button" onClick={() => setOpen(true)} title="Expandir gráfico de pendências por usuário" aria-label="Expandir gráfico de pendências por usuário" className="flex h-24 w-64 items-end gap-2 rounded-md px-1 text-left hover:bg-muted">
      <div className="h-full flex-1"><ResponsiveContainer width="100%" height="100%"><BarChart data={sorted} margin={{ top: 14, right: 0, bottom: 2, left: 0 }}><XAxis dataKey="initials" axisLine={false} tickLine={false} interval={0} tick={{ fontSize: 10, fill: 'var(--foreground)' }} height={22} /><Tooltip cursor={false} labelFormatter={(_, p) => p?.[0]?.payload ? `${p[0].payload.initials} - ${p[0].payload.name}` : ''} formatter={(v) => [v, 'Pendências']} /><Bar dataKey="total" fill="var(--primary)" radius={[2, 2, 0, 0]} isAnimationActive={false}><LabelList dataKey="total" position="top" fontSize={10} fill="var(--foreground)" /></Bar></BarChart></ResponsiveContainer></div>
      <BarChart3 className="h-4 w-4 shrink-0 text-foreground" />
    </button>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-w-3xl"><DialogHeader><DialogTitle>Pendências por usuário</DialogTitle></DialogHeader>
      <div style={{ height: Math.max(240, sorted.length * 32) }}><ResponsiveContainer width="100%" height="100%"><BarChart data={sorted} layout="vertical" margin={{ left: 8, right: 32 }}><XAxis type="number" hide /><YAxis type="category" dataKey="name" width={200} tickFormatter={(n: string) => { const d = sorted.find(x => x.name === n); return d ? `${d.initials} - ${n}` : n; }} tick={{ fontSize: 12 }} /><Tooltip formatter={(v) => [v, 'Pendências']} /><Bar dataKey="total" fill="var(--primary)" radius={[0, 3, 3, 0]}><LabelList dataKey="total" position="right" fontSize={12} /></Bar></BarChart></ResponsiveContainer></div>
    </DialogContent></Dialog>
  </>;
}
