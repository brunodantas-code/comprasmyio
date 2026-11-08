import type { ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

/** Display order of CDE categories/subcategories; numbers are derived from position. */
export type CdeOrder = { cats: string[]; subs: Record<string, string[]> };

export function mergeCdeOrder(raw: string | null | undefined, defaults: CdeOrder): CdeOrder {
  let saved: Partial<CdeOrder> = {};
  try { saved = JSON.parse(raw ?? "{}") ?? {}; } catch { saved = {}; }
  const keep = (list: unknown, valid: string[]) => {
    const arr = Array.isArray(list) ? list.filter((x): x is string => typeof x === "string" && valid.includes(x)) : [];
    return [...new Set([...arr, ...valid])];
  };
  const subs: Record<string, string[]> = {};
  for (const [k, v] of Object.entries(defaults.subs)) subs[k] = keep(saved.subs?.[k], v);
  return { cats: keep(saved.cats, defaults.cats), subs };
}

export function useCdeOrder(defaults: CdeOrder) {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["cde-order"],
    queryFn: async () => {
      const { data, error } = await supabase.from("cde_selected").select("variant_key").eq("group_key", "cde_order").eq("is_primary", true).maybeSingle();
      if (error) throw error;
      return data?.variant_key ?? null;
    },
  });
  const order = mergeCdeOrder(q.data, defaults);
  async function save(next: CdeOrder) {
    const prev = q.data ?? null;
    const value = JSON.stringify(next);
    qc.setQueryData(["cde-order"], value);
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error("Sessão não encontrada");
      const result = prev !== null
        ? await supabase.from("cde_selected").update({ variant_key: value, chosen_by: user.id }).eq("group_key", "cde_order").eq("variant_key", prev)
        : await supabase.from("cde_selected").insert({ group_key: "cde_order", variant_key: value, chosen_by: user.id });
      if (result.error) throw result.error;
    } catch {
      qc.setQueryData(["cde-order"], prev);
      toast.error("Não foi possível salvar a nova ordem.");
    }
  }
  return { order, save };
}

const grip = (props: Record<string, unknown>, label: string) => (
  <button type="button" {...props} aria-label={`Arrastar ${label}`} title="Arrastar para reordenar" className="flex shrink-0 cursor-grab touch-none items-center text-primary active:cursor-grabbing">
    <GripVertical className="h-4 w-4" />
  </button>
);

function SortableItem({ id, label, children }: { id: string; label: string; children: (handle: ReactNode) => ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={isDragging ? "relative z-10 opacity-80" : undefined}>
      {children(grip({ ...attributes, ...listeners }, label))}
    </div>
  );
}

/** Vertical drag list; each item receives its drag handle to place beside its number. */
export function CdeSortableList({ ids, labelOf, onMove, className, children }: { ids: string[]; labelOf: (id: string) => string; onMove: (ids: string[]) => void; className?: string; children: (id: string, index: number, handle: ReactNode) => ReactNode }) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    onMove(arrayMove(ids, ids.indexOf(String(e.active.id)), ids.indexOf(String(e.over.id))));
  };
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div className={className}>{ids.map((id, i) => <SortableItem key={id} id={id} label={labelOf(id)}>{(h) => children(id, i, h)}</SortableItem>)}</div>
      </SortableContext>
    </DndContext>
  );
}
