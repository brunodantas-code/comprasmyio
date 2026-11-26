import type { ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { CdeCategoryNameContext } from "./cde-category-name";

/** Display order of CDE categories/subcategories; numbers are derived from position. */
export type CdeOrder = { cats: string[]; subs: Record<string, string[]>; titles?: Record<string, string> };

export function mergeCdeOrder(raw: string | null | undefined, defaults: CdeOrder): CdeOrder {
  let saved: Partial<CdeOrder> = {};
  try { saved = JSON.parse(raw ?? "{}") ?? {}; } catch { saved = {}; }
  const keep = (list: unknown, valid: string[]) => {
    const arr = Array.isArray(list) ? list.filter((x): x is string => typeof x === "string" && valid.includes(x)) : [];
    return [...new Set([...arr, ...valid])];
  };
  const subs: Record<string, string[]> = {};
  for (const [k, v] of Object.entries(defaults.subs)) subs[k] = keep(saved.subs?.[k], v);
  // New categories enter at their default position (e.g. a new first item stays first) instead of the end.
  const cats = Array.isArray(saved.cats) ? saved.cats.filter((x): x is string => typeof x === "string" && defaults.cats.includes(x)) : [];
  defaults.cats.forEach((k, i) => { if (!cats.includes(k)) cats.splice(Math.min(i, cats.length), 0, k); });
  const titles: Record<string, string> = {};
  if (saved.titles && typeof saved.titles === "object") {
    for (const [id, title] of Object.entries(saved.titles)) {
      if (defaults.cats.includes(id) && typeof title === "string" && title.trim()) titles[id] = title.trim();
    }
  }
  return { cats: [...new Set(cats)], subs, titles };
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
        ? await supabase.from("cde_selected").update({ variant_key: value, chosen_by: user.id }).eq("group_key", "cde_order").eq("is_primary", true).eq("variant_key", prev).select("variant_key").single()
        : await supabase.from("cde_selected").insert({ group_key: "cde_order", variant_key: value, chosen_by: user.id }).select("variant_key").single();
      if (result.error) throw result.error;
      if (result.data?.variant_key !== value) throw new Error("Configuração não foi salva");
      return true;
    } catch {
      qc.setQueryData(["cde-order"], prev);
      toast.error("Não foi possível salvar a configuração dos itens.");
      return false;
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
export function CdeSortableList({ ids, labelOf, onMove, onRename, className, children }: { ids: string[]; labelOf: (id: string) => string; onMove: (ids: string[]) => void; onRename?: (id: string, title: string) => Promise<boolean>; className?: string; children: (id: string, index: number, handle: ReactNode) => ReactNode }) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    onMove(arrayMove(ids, ids.indexOf(String(e.active.id)), ids.indexOf(String(e.over.id))));
  };
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div className={className}>{ids.map((id, i) => <SortableItem key={id} id={id} label={labelOf(id)}>{(h) => onRename ? <CdeCategoryNameContext.Provider value={{ number: String(i + 1), title: labelOf(id), onSave: title => onRename(id, title) }}>{children(id, i, h)}</CdeCategoryNameContext.Provider> : children(id, i, h)}</SortableItem>)}</div>
      </SortableContext>
    </DndContext>
  );
}
