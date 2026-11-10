import { useState } from 'react';
import { BarChart3 } from 'lucide-react';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, LabelList } from 'recharts';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export type UserBar = { name: string; total: number };

export function UserPendingBars({ data }: { data: UserBar[] }) {
  const [open, setOpen] = useState(false);
  if (!data.length) return null;
  const sorted = [...data].sort((a, b) => b.total - a.total);
  return <>
    <button type="button" onClick={() => setOpen(true)} title="Expandir gráfico de pendências por usuário" aria-label="Expandir gráfico de pendências por usuário" className="flex h-14 w-56 items-end gap-2 rounded-md px-1 text-left hover:bg-muted">
      <div className="h-full flex-1"><ResponsiveContainer width="100%" height="100%"><BarChart data={sorted} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}><Bar dataKey="total" fill="var(--primary)" radius={[2, 2, 0, 0]} isAnimationActive={false} /></BarChart></ResponsiveContainer></div>
      <BarChart3 className="h-4 w-4 shrink-0 text-foreground" />
    </button>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-w-3xl"><DialogHeader><DialogTitle>Pendências por usuário</DialogTitle></DialogHeader>
      <div style={{ height: Math.max(240, sorted.length * 32) }}><ResponsiveContainer width="100%" height="100%"><BarChart data={sorted} layout="vertical" margin={{ left: 8, right: 32 }}><XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} /><YAxis type="category" dataKey="name" width={170} tick={{ fontSize: 12 }} /><Tooltip formatter={(v) => [v, 'Pendências']} /><Bar dataKey="total" fill="var(--primary)" radius={[0, 3, 3, 0]}><LabelList dataKey="total" position="right" fontSize={12} /></Bar></BarChart></ResponsiveContainer></div>
    </DialogContent></Dialog>
  </>;
}
