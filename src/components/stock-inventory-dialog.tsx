import { useState } from 'react';
import { format } from 'date-fns';
import { ClipboardList, Plus, Save, Pencil, Check } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { Button } from '@/components/ui/button';
import { CdeButton } from '@/components/cde/cde-button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StockDatePicker } from './stock-date-picker';
import { confirmAction } from './confirm-dialog';
import { inventoryDifference, nextInventoryDate } from '@/lib/stock-inventory';

type Row = { material_id: string; name: string; balance: number };
type Item = Row & { counted: number | null; difference?: number | null };
const intervals = [{ value: 0, label: 'Sem recorrência' }, { value: 1, label: 'Mensal' }, { value: 3, label: 'Trimestral' }, { value: 6, label: 'Semestral' }, { value: 12, label: 'Anual' }];

export function StockInventoryDialog({ area, rows }: { area: string; rows: Row[] }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [id, setId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [counters, setCounters] = useState('');
  const [months, setMonths] = useState(0);
  const [items, setItems] = useState<Item[]>([]);
  const qc = useQueryClient();
  const catalog = useQuery({ queryKey: ['inventory-catalog', area], enabled: open, queryFn: async () => {
    if (area === 'terceiros') {
      const { data, error } = await supabase.from('terceiros_materials').select('id');
      if (error) throw error;
      return (data ?? []).map(row => row.id);
    }
    const { data, error } = await supabase.from('materials').select('id, is_manufactured').eq('location', area);
    if (error) throw error;
    return (data ?? []).filter(row => area !== 'fabrica' || !row.is_manufactured).map(row => row.id);
  }});
  const history = useQuery({ queryKey: ['stock-inventories', area], enabled: open, queryFn: async () => {
    const { data, error } = await supabase.from('stock_inventories').select('*').eq('area', area).order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  }});
  const save = useMutation({ mutationFn: async (complete: boolean) => {
    const names = counters.split(/[,;\n]/).map(n => n.trim()).filter(Boolean);
    if (!name.trim() || !date || !names.length) throw new Error('Informe nome, data e inventariantes');
    if (!items.length) throw new Error('Nenhum item para contar');
    if (complete && items.some(item => item.counted === null)) throw new Error('Informe a contagem de todos os itens, inclusive os zerados');
    for (const item of items) if (item.counted !== null) inventoryDifference(item.counted, item.balance);
    const { data, error } = await supabase.rpc('save_stock_inventory', { _id: id ?? crypto.randomUUID(), _name: name, _area: area, _date: date, _counters: names, _months: months, _items: items as unknown as Json, _complete: complete });
    if (error) throw error;
    return data;
  }, onSuccess: () => {
    toast.success('Inventário registrado');
    setEditing(false);
    for (const key of ['stock-inventories', 'material-stock', 'stock-movements', 'terceiros-stock', 'terceiros-movements']) qc.invalidateQueries({ queryKey: [key] });
  }, onError: (e: Error) => toast.error(e.message) });
  function start(source?: NonNullable<typeof history.data>[number]) {
    setId(source?.status === 'draft' ? source.id : crypto.randomUUID());
    setName(source?.name ?? `Inventário ${format(new Date(), 'dd/MM/yyyy')}`);
    setDate(source?.status === 'draft' ? source.inventory_date : source?.next_date ?? format(new Date(), 'yyyy-MM-dd'));
    setCounters(source?.counters.join(', ') ?? '');
    setMonths(source?.recurrence_months ?? 0);
    const previous = source?.status === 'draft' && Array.isArray(source.items) ? source.items as unknown as Item[] : [];
    setItems(rows.filter(row => catalog.data?.includes(row.material_id)).map(row => ({ ...row, counted: previous.find(item => item.material_id === row.material_id)?.counted ?? null })));
    setEditing(true);
  }
  const completed = history.data?.filter(record => record.status === 'completed') ?? [];
  const selectedCompleted = completed.find(record => record.id === id);
  const readOnly = !!selectedCompleted;
  const previousInventory = completed.find(record => record.id !== id && (!selectedCompleted?.completed_at || (record.completed_at ?? '') < selectedCompleted.completed_at));
  const previousItems = (previousInventory?.items ?? []) as unknown as Item[];
  const comparison = useQuery({ queryKey: ['inventory-comparison', area, previousInventory?.completed_at, selectedCompleted?.completed_at], enabled: open && editing && !!previousInventory?.completed_at, queryFn: async () => {
    const { data, error } = await supabase.rpc('inventory_comparison', { _area: area, _after: previousInventory?.completed_at ?? undefined, _until: selectedCompleted?.completed_at ?? undefined });
    if (error) throw error;
    return data ?? [];
  }});
  const upcoming = completed[0];
  return <Dialog open={open} onOpenChange={value => { setOpen(value); if (!value) setEditing(false); }}>
    <DialogTrigger asChild><Button variant="outline" title="Inventário"><ClipboardList className="size-4" />Inventário</Button></DialogTrigger>
    <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-4xl"><DialogHeader><DialogTitle>Inventário</DialogTitle></DialogHeader>
      {!editing ? <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3"><div>{upcoming?.next_date && <span className={upcoming.next_date < format(new Date(), 'yyyy-MM-dd') ? 'text-destructive' : 'text-muted-foreground'}>Próxima contagem: {format(new Date(`${upcoming.next_date}T12:00:00`), 'dd/MM/yyyy')}</span>}</div><CdeButton group="plus" title="Novo inventário" aria-label="Novo inventário" disabled={!rows.length || catalog.isLoading || history.isLoading || !!catalog.error} onClick={() => start(upcoming)}><Plus /></CdeButton></div>
        {history.isLoading && <p>Carregando inventários…</p>}{history.error && <p className="text-destructive">{history.error.message}</p>}
        <Table><TableHeader><TableRow><TableHead>Inventário</TableHead><TableHead>Data</TableHead><TableHead>Inventariantes</TableHead><TableHead>Situação</TableHead><TableHead>Recorrência</TableHead><TableHead>Ações</TableHead></TableRow></TableHeader><TableBody>
          {history.data?.map(record => <TableRow key={record.id}><TableCell>{record.name}</TableCell><TableCell>{record.inventory_date.split('-').reverse().join('/')}</TableCell><TableCell>{record.counters.join(', ')}</TableCell><TableCell>{record.status === 'completed' ? 'Concluído' : 'Em contagem'}</TableCell><TableCell>{intervals.find(i => i.value === record.recurrence_months)?.label}</TableCell><TableCell>{record.status === 'draft' ? <Button variant="ghost" size="icon" title="Editar inventário" onClick={() => start(record)}><Pencil className="size-4" /></Button> : <Button variant="ghost" size="icon" title="Ver contagem" onClick={() => { setId(record.id); setName(record.name); setDate(record.inventory_date); setCounters(record.counters.join(', ')); setMonths(record.recurrence_months); setItems(record.items as unknown as Item[]); setEditing(true); }}><ClipboardList className="size-4" /></Button>}</TableCell></TableRow>)}
          {!history.isLoading && !history.data?.length && <TableRow><TableCell colSpan={6}>Nenhum inventário registrado.</TableCell></TableRow>}
        </TableBody></Table>
      </div> : <div className="space-y-4">
        <fieldset disabled={readOnly} className="grid gap-4 sm:grid-cols-2"><div><Label htmlFor="inventory-name">Nome do inventário</Label><Input id="inventory-name" value={name} onChange={e => setName(e.target.value)} disabled={history.data?.some(r => r.id === id && r.status === 'completed')} /></div><div><Label>Data do inventário</Label><StockDatePicker label="Data do inventário" value={date} onChange={setDate} /></div><div><Label htmlFor="inventory-counters">Inventariantes</Label><Input id="inventory-counters" value={counters} onChange={e => setCounters(e.target.value)} /></div><div><Label>Recorrência</Label><Select value={String(months)} onValueChange={v => setMonths(Number(v))}><SelectTrigger aria-label="Recorrência"><SelectValue /></SelectTrigger><SelectContent>{intervals.map(i => <SelectItem key={i.value} value={String(i.value)}>{i.label}</SelectItem>)}</SelectContent></Select></div></fieldset>
        {months > 0 && <p className="text-sm text-muted-foreground">Próximo inventário: {nextInventoryDate(date, months)?.split('-').reverse().join('/')}</p>}
        {comparison.error && <p className="text-destructive">{comparison.error.message}</p>}
        <Table><TableHeader><TableRow><TableHead>Item</TableHead><TableHead>Inventário N</TableHead><TableHead>Entradas por compras</TableHead><TableHead>Saídas da Fábrica</TableHead><TableHead>Saldo</TableHead><TableHead>Inventário N+1</TableHead><TableHead>Divergências ou confirmação</TableHead></TableRow></TableHeader><TableBody>{items.map((item, index) => {
          const old = previousItems.find(row => row.material_id === item.material_id);
          const movements = comparison.data?.find(row => row.material_id === item.material_id);
          const difference = item.counted === null ? null : item.counted >= 0 ? inventoryDifference(item.counted, item.balance) : null;
          const field = <Input type="number" min={0} step="0.001" aria-label={`Contagem ${item.name}`} value={item.counted ?? ''} disabled={readOnly} onChange={e => setItems(current => current.map((row, position) => position === index ? { ...row, counted: e.target.value === '' ? null : Number(e.target.value) } : row))} />;
          return <TableRow key={item.material_id}><TableCell>{item.name}</TableCell><TableCell>{previousInventory ? old?.counted ?? '—' : field}</TableCell><TableCell>{previousInventory ? comparison.isLoading ? '…' : movements?.purchases ?? 0 : '—'}</TableCell><TableCell>{previousInventory ? comparison.isLoading ? '…' : movements?.factory_exits ?? 0 : '—'}</TableCell><TableCell title="Inclui todas as movimentações registradas">{item.balance}</TableCell><TableCell>{previousInventory ? field : '—'}</TableCell><TableCell>{difference === null ? '—' : difference === 0 ? 'Confirmado' : difference > 0 ? `+${difference}` : difference}</TableCell></TableRow>;
        })}</TableBody></Table>
        {!history.data?.some(r => r.id === id && r.status === 'completed') && <div className="flex justify-end gap-3"><Button variant="ghost" size="icon" aria-label="Salvar contagem" title="Salvar contagem" disabled={save.isPending} onClick={() => save.mutate(false)}><Save className="size-4" /></Button><Button variant="outline" disabled={save.isPending} onClick={async () => { if (await confirmAction('Concluir o inventário e ajustar os saldos às quantidades contadas? Esta contagem ficará preservada no histórico.', { title: 'Concluir inventário', confirmLabel: 'Concluir e ajustar saldos' })) save.mutate(true); }}><Check className="size-4" />Concluir inventário</Button></div>}
      </div>}
    </DialogContent>
  </Dialog>;
}