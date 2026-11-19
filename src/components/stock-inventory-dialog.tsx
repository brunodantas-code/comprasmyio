import { useState } from 'react';
import { format } from 'date-fns';
import { ClipboardList, Save, Pencil, Check, X, FileSignature, FileSpreadsheet, FileDown } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { Button } from '@/components/ui/button';
import { CdeButton } from '@/components/cde/cde-button';
import { useTableFilters } from '@/components/use-table-filters';
import { TableSortMenu, type TableSorting } from '@/components/table-sort-menu';
import { compareColumnValues } from '@/lib/column-sort';
import { useCurrentUser } from '@/hooks/use-current-user';
import { InventorySignatureDialog } from '@/components/inventory-signature-dialog';
import { signatureDate } from '@/lib/signatures';
import { exportInventory } from '@/lib/inventory-export';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StockDatePicker } from './stock-date-picker';
import { confirmAction } from './confirm-dialog';
import { addInventoryCounter, INVENTORY_COUNT_DEFAULT, INVENTORY_COUNT_STEP, inventoryCountDifference, inventoryDifference, isInventoryCount, nextInventoryDate } from '@/lib/stock-inventory';

type Row = { material_id: string; name: string; balance: number };
type Item = Row & { counted: number | null; difference?: number | null; confirmed?: boolean };
const intervals = [{ value: 0, label: 'Sem recorrência' }, { value: 1, label: 'Mensal' }, { value: 3, label: 'Trimestral' }, { value: 6, label: 'Semestral' }, { value: 12, label: 'Anual' }];

export function StockInventoryDialog({ area, rows }: { area: string; rows: Row[] }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [id, setId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [counters, setCounters] = useState<string[]>([]);
  const [addingCounter, setAddingCounter] = useState(false);
  const [counterName, setCounterName] = useState('');
  const [months, setMonths] = useState(0);
  const [items, setItems] = useState<Item[]>([]);
  const qc = useQueryClient();
  const { data: me } = useCurrentUser();
  const [signing, setSigning] = useState(false);
  const [exporting, setExporting] = useState(false);
  const signatures = useQuery({ queryKey: ['inventory-signatures', id], enabled: open && !!id, queryFn: async () => {
    const { data, error } = await supabase.from('stock_inventory_signatures').select('*').eq('inventory_id', id ?? '');
    if (error) throw error; return data ?? [];
  } });
  const users = useQuery({ queryKey: ['inventory-users'], enabled: open, queryFn: async () => {
    const { data, error } = await supabase.from('profiles').select('id, full_name').is('deleted_at', null).order('full_name');
    if (error) throw error;
    return data ?? [];
  }});
  function addCounter(value: string) {
    setCounters(current => addInventoryCounter(current, value));
    setCounterName('');
    setAddingCounter(false);
  }
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
  const save = useMutation({ mutationFn: async ({ complete, confirmIndex }: { complete: boolean; confirmIndex?: number }) => {
    const savedItems = items.map((item, index) => index === confirmIndex ? { ...item, confirmed: true } : item);
    const names = counters;
    if (!name.trim() || !date || !names.length) throw new Error('Informe nome, data e inventariantes');
    if (!items.length) throw new Error('Nenhum item para contar');
    if (complete && items.some(item => item.counted === null)) throw new Error('Informe a contagem de todos os itens, inclusive os zerados');
    if (complete && items.some(item => !item.confirmed)) throw new Error('Confirme a contagem de cada item antes de concluir');
    for (const item of items) if (item.counted !== null) inventoryDifference(item.counted, item.balance);
    const { data, error } = await supabase.rpc('save_stock_inventory', { _id: id ?? crypto.randomUUID(), _name: name, _area: area, _date: date, _counters: names, _months: months, _items: savedItems as unknown as Json, _complete: complete });
    if (error) throw error;
    return data;
  }, onSuccess: (_, variables) => {
    toast.success('Inventário registrado');
    if (variables.confirmIndex !== undefined) setItems(current => current.map((item, index) => index === variables.confirmIndex ? { ...item, confirmed: true } : item));
    else setEditing(false);
    for (const key of ['stock-inventories', 'material-stock', 'stock-movements', 'terceiros-stock', 'terceiros-movements', 'inventory-signatures', 'pending-actions']) qc.invalidateQueries({ queryKey: [key] });
  }, onError: (e: Error) => toast.error(e.message) });
  function start(source?: NonNullable<typeof history.data>[number]) {
    setId(source?.status === 'draft' ? source.id : crypto.randomUUID());
    setName(source?.name ?? `Inventário ${format(new Date(), 'dd/MM/yyyy')}`);
    setDate(source?.status === 'draft' ? source.inventory_date : source?.next_date ?? format(new Date(), 'yyyy-MM-dd'));
    setCounters(source?.counters ?? []);
    setAddingCounter(false);
    setCounterName('');
    setMonths(source?.recurrence_months ?? 0);
    const previous = source?.status === 'draft' && Array.isArray(source.items) ? source.items as unknown as Item[] : [];
    setItems(rows.filter(row => catalog.data?.includes(row.material_id)).map(row => {
      const saved = previous.find(item => item.material_id === row.material_id);
      return { ...row, counted: saved ? saved.counted : INVENTORY_COUNT_DEFAULT, confirmed: saved?.confirmed ?? false };
    }));
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
  const [sorting, setSorting] = useState<TableSorting | undefined>({ key: 'name', direction: 'asc' });
  const itemColumns = [
    { key: 'name', label: 'Item', value: (item: Item) => item.name },
    { key: 'balance', label: 'Saldo', kind: 'number' as const, value: (item: Item) => item.balance },
    { key: 'counted', label: 'Contagem', kind: 'number' as const, value: (item: Item) => item.counted },
    { key: 'confirmation', label: 'Confirmação', value: (item: Item) => item.confirmed || readOnly ? 'Confirmado' : 'A confirmar' },
    { key: 'difference', label: 'Divergência', kind: 'number' as const, value: (item: Item) => inventoryCountDifference(item.counted, item.balance, !!previousInventory) },
  ];
  const itemFilters = useTableFilters(items, itemColumns);
  const sortedColumn = itemColumns.find(column => column.key === sorting?.key);
  const visibleItems = sortedColumn && sorting ? [...itemFilters.filtered].sort((a, b) => compareColumnValues(sortedColumn.kind ?? 'text', sortedColumn.value(a), sortedColumn.value(b), sorting.direction)) : itemFilters.filtered;
  async function exportCount(format: 'pdf' | 'xlsx') {
    setExporting(true);
    try {
      if (!readOnly) for (const item of items) if (item.counted !== null) inventoryDifference(item.counted, item.balance);
      await exportInventory({ name, date, area: ({ fabrica: 'Estoque de Componentes', terceiros: 'Insumos de Instalação', almoxarifado: 'Estoque myio', almoxarifado_geral: 'Almoxarifado' } as Record<string,string>)[area] ?? area, counters, status: readOnly ? 'completed' : 'draft', signatures: signatures.data ?? [], columns: ['Item', 'Inventário N', 'Entradas por compras', 'Saídas da Fábrica', 'Saldo', 'Inventário N+1', 'Divergências ou confirmação'], rows: visibleItems.map(item => {
        const old = previousItems.find(row => row.material_id === item.material_id);
        const movement = comparison.data?.find(row => row.material_id === item.material_id);
        const difference = item.counted !== null && item.counted >= 0 ? inventoryCountDifference(item.counted, item.balance, !!previousInventory) : null;
        return [item.name, previousInventory ? old?.counted ?? null : item.counted, previousInventory ? movement?.purchases ?? 0 : null, previousInventory ? movement?.factory_exits ?? 0 : null, item.balance, previousInventory ? item.counted : null, difference !== null && difference !== 0 ? difference : item.confirmed || readOnly ? 'Confirmado' : null];
      }) }, format);
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Não foi possível exportar'); }
    finally { setExporting(false); }
  }
  return <Dialog open={open} onOpenChange={value => { setOpen(value); if (!value) setEditing(false); }}>
    <DialogTrigger asChild><Button variant="action" title="Inventário"><ClipboardList className="size-4" />Inventário</Button></DialogTrigger>
    <DialogContent className="stock-inventory max-h-[85vh] overflow-y-auto sm:max-w-4xl"><DialogHeader><DialogTitle>Inventário</DialogTitle></DialogHeader>
      {!editing ? <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3"><div>{upcoming?.next_date && <span className={upcoming.next_date < format(new Date(), 'yyyy-MM-dd') ? 'text-destructive' : 'text-muted-foreground'}>Próxima contagem: {format(new Date(`${upcoming.next_date}T12:00:00`), 'dd/MM/yyyy')}</span>}</div><CdeButton group="plus" title="Novo inventário" aria-label="Novo inventário" disabled={!rows.length || catalog.isLoading || history.isLoading || !!catalog.error} onClick={() => start(upcoming)} /></div>
        {history.isLoading && <p>Carregando inventários…</p>}{history.error && <p className="text-destructive">{history.error.message}</p>}
        <Table><TableHeader><TableRow><TableHead>Inventário</TableHead><TableHead>Data</TableHead><TableHead>Inventariantes</TableHead><TableHead>Situação</TableHead><TableHead>Recorrência</TableHead><TableHead>Ações</TableHead></TableRow></TableHeader><TableBody>
          {history.data?.map(record => <TableRow key={record.id}><TableCell>{record.name}</TableCell><TableCell>{record.inventory_date.split('-').reverse().join('/')}</TableCell><TableCell>{record.counters.join(', ')}</TableCell><TableCell>{record.status === 'completed' ? 'Concluído' : 'Em contagem'}</TableCell><TableCell>{intervals.find(i => i.value === record.recurrence_months)?.label}</TableCell><TableCell>{record.status === 'draft' ? <Button variant="ghost" size="icon" title="Editar inventário" onClick={() => start(record)}><Pencil className="size-4" /></Button> : <Button variant="ghost" size="icon" title="Ver contagem" onClick={() => { setId(record.id); setName(record.name); setDate(record.inventory_date); setCounters(record.counters); setMonths(record.recurrence_months); setItems(record.items as unknown as Item[]); setEditing(true); }}><ClipboardList className="size-4" /></Button>}</TableCell></TableRow>)}
          {!history.isLoading && !history.data?.length && <TableRow><TableCell colSpan={6}>Nenhum inventário registrado.</TableCell></TableRow>}
        </TableBody></Table>
      </div> : <div className="space-y-4">
        <div className="flex justify-end gap-2"><Button variant="action" disabled={exporting || comparison.isFetching || !!comparison.error || signatures.isFetching} aria-label="Exportar inventário em Excel" onClick={() => void exportCount('xlsx')}><FileSpreadsheet className="size-4" />Excel</Button><Button variant="action" disabled={exporting || comparison.isFetching || !!comparison.error || signatures.isFetching} aria-label="Exportar inventário em PDF" onClick={() => void exportCount('pdf')}><FileDown className="size-4" />PDF</Button></div>
        <fieldset disabled={readOnly} className="grid gap-4 sm:grid-cols-2"><div><Label htmlFor="inventory-name">Nome do inventário</Label><Input id="inventory-name" value={name} onChange={e => setName(e.target.value)} disabled={readOnly} /></div><div><Label>Data do inventário</Label><StockDatePicker label="Data do inventário" value={date} onChange={setDate} /></div><div className="min-w-0"><Label>Inventariantes</Label>{!readOnly && <div className="flex items-center gap-2"><SearchableSelect aria-label="Selecionar inventariante" value="" onChange={value => { const user = users.data?.find(row => row.id === value); if (user?.full_name) addCounter(user.full_name); }} options={(users.data ?? []).filter(user => user.full_name).map(user => ({ value: user.id, label: user.full_name ?? '' }))} placeholder={users.isLoading ? 'Carregando usuários…' : 'Selecionar usuário'} disabled={users.isLoading} className="min-w-0 flex-1" /><CdeButton group="plus" aria-label="Adicionar inventariante" title="Adicionar inventariante" onClick={() => setAddingCounter(value => !value)} /></div>}{users.error && !readOnly && <p role="alert" className="text-sm text-destructive">Não foi possível carregar os usuários.</p>}{addingCounter && !readOnly && <div className="mt-2 flex items-center gap-2"><Input aria-label="Nome do inventariante" value={counterName} onChange={e => setCounterName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCounter(counterName); } }} /><Button variant="ghost" size="icon" aria-label="Confirmar inventariante" title="Confirmar inventariante" disabled={!counterName.trim()} onClick={() => addCounter(counterName)}><Check className="size-4" /></Button></div>}<div className="mt-2 space-y-1">{counters.map(counter => <div key={counter} className="flex min-w-0 items-center gap-2"><span className="min-w-0 flex-1 break-words">{counter}</span>{!readOnly && <Button variant="ghost" size="icon" aria-label={`Remover inventariante ${counter}`} title={`Remover ${counter}`} onClick={() => setCounters(current => current.filter(name => name !== counter))}><X className="size-4" /></Button>}</div>)}</div></div><div><Label>Recorrência</Label><Select value={String(months)} onValueChange={v => setMonths(Number(v))}><SelectTrigger aria-label="Recorrência"><SelectValue /></SelectTrigger><SelectContent>{intervals.map(i => <SelectItem key={i.value} value={String(i.value)}>{i.label}</SelectItem>)}</SelectContent></Select></div></fieldset>
        {months > 0 && <p className="text-sm text-muted-foreground">Próximo inventário: {nextInventoryDate(date, months)?.split('-').reverse().join('/')}</p>}
        {comparison.error && <p className="text-destructive">{comparison.error.message}</p>}
        <div className="flex justify-end"><TableSortMenu columns={itemColumns} value={sorting} onChange={setSorting} /></div>
        {itemFilters.summary}
        <Table><TableHeader><TableRow><TableHead>{itemFilters.header('name')}</TableHead><TableHead>Inventário N</TableHead><TableHead>Entradas por compras</TableHead><TableHead>Saídas da Fábrica</TableHead><TableHead>Saldo</TableHead><TableHead>Inventário N+1</TableHead><TableHead>Divergências ou confirmação</TableHead></TableRow></TableHeader><TableBody>{visibleItems.map(item => {
          const index = items.findIndex(row => row.material_id === item.material_id);
          const old = previousItems.find(row => row.material_id === item.material_id);
          const movements = comparison.data?.find(row => row.material_id === item.material_id);
          const difference = item.counted !== null && item.counted < 0 ? null : inventoryCountDifference(item.counted, item.balance, !!previousInventory);
          const field = <Input type="number" min={0} step={INVENTORY_COUNT_STEP} aria-invalid={item.counted !== null && !isInventoryCount(item.counted)} aria-label={`Contagem ${item.name}`} value={item.counted ?? ''} disabled={readOnly || save.isPending} onChange={e => setItems(current => current.map((row, position) => position === index ? { ...row, counted: e.target.value === '' ? null : Number(e.target.value), confirmed: false } : row))} />;
          const divergent = difference !== null && difference !== 0;
          return <TableRow key={item.material_id}><TableCell>{item.name}</TableCell><TableCell>{previousInventory ? old?.counted ?? '—' : field}</TableCell><TableCell>{previousInventory ? comparison.isLoading ? '…' : movements?.purchases ?? 0 : '—'}</TableCell><TableCell>{previousInventory ? comparison.isLoading ? '…' : movements?.factory_exits ?? 0 : '—'}</TableCell><TableCell title="Inclui todas as movimentações registradas">{item.balance}</TableCell><TableCell>{previousInventory ? field : '—'}</TableCell><TableCell><div className="flex items-center justify-center gap-2">{divergent ? <span>{difference > 0 ? `+${difference}` : difference}</span> : item.confirmed || readOnly ? <span>Confirmado</span> : null}{!readOnly && <Button variant="ghost" size="icon" aria-label={`${divergent ? 'Salvar divergência' : 'Confirmar contagem'} ${item.name}`} title={item.confirmed ? 'Contagem confirmada' : divergent ? 'Salvar divergência' : 'Confirmar contagem'} disabled={save.isPending || !isInventoryCount(item.counted) || item.confirmed} onClick={() => save.mutate({ complete: false, confirmIndex: index })}>{divergent && !item.confirmed ? <Save className="size-4" /> : <Check className="size-4" />}</Button>}</div></TableCell></TableRow>;
        })}</TableBody></Table>
        {readOnly && <section className="space-y-2"><h2 className="text-sm">Assinaturas dos inventariantes</h2>{counters.map(counter => {
          const signer = signatures.data?.find(s => s.signer_name === counter);
          return <div key={counter} className="flex items-center gap-2"><span className="min-w-0 flex-1 break-words">{counter} — {signer ? signer.signed_at ? `Assinado em ${signatureDate(signer.signed_at)}` : <span className="text-destructive">Aguardando assinatura</span> : 'Sem assinatura ERP'}</span>{signer && !signer.signed_at && <Button variant="action" size="icon" aria-label={`Assinar como ${counter}`} title={signer.user_id === me?.id ? 'Assinar' : 'Somente este inventariante pode assinar'} disabled={signer.user_id !== me?.id} onClick={() => setSigning(true)}><FileSignature className="size-4" /></Button>}</div>;
        })}</section>}
        {!history.data?.some(r => r.id === id && r.status === 'completed') && <div className="flex justify-end gap-3"><Button variant="ghost" size="icon" aria-label="Salvar contagem" title="Salvar contagem" disabled={save.isPending} onClick={() => save.mutate({ complete: false })}><Save className="size-4" /></Button><Button variant="outline" disabled={save.isPending} onClick={async () => { if (await confirmAction('Concluir o inventário e ajustar os saldos às quantidades contadas? Esta contagem ficará preservada no histórico.', { title: 'Concluir inventário', confirmLabel: 'Concluir e ajustar saldos' })) save.mutate({ complete: true }); }}><Check className="size-4" />Concluir inventário</Button></div>}
      </div>}
    </DialogContent>
    {me && <InventorySignatureDialog inventory={signing && selectedCompleted ? selectedCompleted : null} userId={me.id} close={() => setSigning(false)} />}
  </Dialog>;
}