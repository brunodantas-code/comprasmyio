import { useState, type ReactNode } from 'react';
import { DndContext, PointerSensor, KeyboardSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, useSortable, arrayMove, verticalListSortingStrategy, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { TableBody, TableRow } from '@/components/ui/table';
import { sequentialRegistryOrder } from '@/lib/registry-order';

type RegistryRow = { code: string; name: string; position: number };

export function SortableRegistryBody<T extends RegistryRow>({ rows, persist, render, empty }: {
  rows: T[];
  persist: (rows: T[]) => Promise<void>;
  render: (row: T, handle: ReactNode, index: number) => ReactNode;
  empty: ReactNode;
}) {
  const [draft, setDraft] = useState<T[] | null>(null);
  const [busy, setBusy] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const list = draft ?? rows;
  return <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={async ({ active, over }) => {
    if (busy || !over || active.id === over.id) return;
    const from = list.findIndex(row => row.code === active.id);
    const to = list.findIndex(row => row.code === over.id);
    if (from < 0 || to < 0) return;
    const next = sequentialRegistryOrder(arrayMove(list, from, to));
    setDraft(next); setBusy(true);
    try { await persist(next); }
    catch { toast.error('Não foi possível salvar a ordem.'); }
    finally { setDraft(null); setBusy(false); }
  }}><SortableContext items={list.map(row => row.code)} strategy={verticalListSortingStrategy}><TableBody>{list.map((row, index) => <SortableRegistryRow key={row.code} row={row} index={index} disabled={busy} render={render} />)}{list.length === 0 && empty}</TableBody></SortableContext></DndContext>;
}

function SortableRegistryRow<T extends RegistryRow>({ row, index, disabled, render }: { row: T; index: number; disabled: boolean; render: (row: T, handle: ReactNode, index: number) => ReactNode }) {
  const { setNodeRef, attributes, listeners, transform, transition } = useSortable({ id: row.code, disabled });
  const handle = <Button variant="ghost" size="compactIcon" disabled={disabled} className="shrink-0 touch-none cursor-grab" aria-label={`Arrastar ${row.name}`} title={`Arrastar ${row.name}`} {...attributes} {...listeners}><GripVertical /></Button>;
  return <TableRow ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }}>{render(row, handle, index)}</TableRow>;
}