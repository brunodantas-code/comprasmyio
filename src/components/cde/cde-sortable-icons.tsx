import { DndContext, PointerSensor, KeyboardSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy, useSortable, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { MENU_ORDER_GROUP, menuKey, sortByMenuOrder, useMenuOrders } from "./menu-order";

type Item = { label: string; icon: React.ComponentType<{ className?: string }>; name: string };

function SortableTile({ it, n }: { it: Item; n: number }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: it.label });
  const Icon = it.icon;
  return <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={`flex w-28 items-start gap-1 ${isDragging ? "z-10 opacity-70" : ""}`}>
    <button type="button" {...attributes} {...listeners} aria-label={`Arrastar ${it.label}`} className="mt-3 cursor-grab touch-none text-primary active:cursor-grabbing"><GripVertical className="h-4 w-4" /></button>
    <div className="flex min-w-0 flex-1 flex-col items-center gap-1 text-center">
      <span className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-background"><Icon className="h-5 w-5" /><span className="absolute -left-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-0.5 text-[9px] leading-none text-primary-foreground">{n}</span></span>
      <span className="text-[0.7rem] leading-tight">{it.label}</span>
      <span className="text-[0.6rem] leading-3 text-muted-foreground/70">{it.name}</span>
    </div>
  </div>;
}

/** Drag-and-drop icon list; the saved order is applied live to the app's real menu (menu-order.ts). */
export function CdeSortableIcons({ app, group, items }: { app: string; group: string; items: Item[] }) {
  const qc = useQueryClient();
  const { data } = useMenuOrders();
  const key = menuKey(app, group);
  const ordered = sortByMenuOrder(items, data?.[key]);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  async function onDragEnd(e: DragEndEvent) {
    if (!e.over || e.active.id === e.over.id) return;
    const labels = ordered.map((i) => i.label);
    const next = arrayMove(labels, labels.indexOf(String(e.active.id)), labels.indexOf(String(e.over.id)));
    const all = { ...(data ?? {}), [key]: next };
    qc.setQueryData(["cde-menu-order"], all);
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error();
      const existing = await supabase.from("cde_selected").select("variant_key").eq("group_key", MENU_ORDER_GROUP).eq("is_primary", true).maybeSingle();
      const row = { variant_key: JSON.stringify(all), chosen_by: user.id };
      const r = existing.data ? await supabase.from("cde_selected").update(row).eq("group_key", MENU_ORDER_GROUP).eq("variant_key", existing.data.variant_key) : await supabase.from("cde_selected").insert({ ...row, group_key: MENU_ORDER_GROUP });
      if (r.error) throw r.error;
      toast.success("Ordem do menu salva");
    } catch { toast.error("Não foi possível salvar a ordem (somente Admin)."); } finally { qc.invalidateQueries({ queryKey: ["cde-menu-order"] }); }
  }
  return <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
    <SortableContext items={ordered.map((i) => i.label)} strategy={rectSortingStrategy}>
      <div className="flex flex-wrap gap-3">{ordered.map((it, i) => <SortableTile key={it.label} it={it} n={i + 1} />)}</div>
    </SortableContext>
  </DndContext>;
}
