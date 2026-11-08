import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronDown, ChevronUp, GripVertical, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { CdeCategoryHeader } from "./cde-category-header";
import { MENU_ITEMS, parseMenuConfig, useMainMenuConfig, type MenuId, type MenuConfig } from "./main-menu-config";

function MenuRow({ id, checked, onChange }: { id: MenuId; checked: boolean; onChange: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const item = MENU_ITEMS.find((i) => i.id === id);
  if (!item) return null;
  const Icon = item.icon;
  return <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className="flex items-center gap-3 border-b border-border bg-card py-2">
    <Button variant="ghost" size="compactIcon" aria-label={`Mover ${item.label}`} title={`Mover ${item.label}`} {...attributes} {...listeners} className="touch-none"><GripVertical /></Button>
    <Icon className="h-5 w-5" /><span className="flex-1 text-sm">{item.label}</span>
    <Checkbox aria-label={`Exibir ${item.label}`} checked={checked} disabled={id === "logout"} onCheckedChange={onChange} />
  </div>;
}
export function CdeMainMenu({ number }: { number: number }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<MenuConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const { data } = useMainMenuConfig();
  const qc = useQueryClient();
  const config = draft ?? data ?? parseMenuConfig();
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  function move(event: DragEndEvent) {
    if (!event.over || event.active.id === event.over.id) return;
    const from = config.order.indexOf(event.active.id as MenuId), to = config.order.indexOf(event.over.id as MenuId);
    if (from < 0 || to < 0) return;
    setDraft({ ...config, order: arrayMove(config.order, from, to) });
  }
  async function save() {
    setSaving(true);
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error("Sessão não encontrada");
      const existing = await supabase.from("cde_selected").select("variant_key").eq("group_key", "main_menu").eq("is_primary", true).maybeSingle();
      if (existing.error) throw existing.error;
      const row = { variant_key: JSON.stringify(config), chosen_by: user.id };
      const result = existing.data ? await supabase.from("cde_selected").update(row).eq("group_key", "main_menu").eq("variant_key", existing.data.variant_key) : await supabase.from("cde_selected").insert({ ...row, group_key: "main_menu" });
      if (result.error) throw result.error;
      await qc.invalidateQueries({ queryKey: ["cde-main-menu"] });
      setDraft(null); toast.success("Menu principal atualizado");
    } catch { toast.error("Não foi possível salvar o menu."); } finally { setSaving(false); }
  }
  return <section className="space-y-4">
    <CdeCategoryHeader number={number} title="Menu principal" hint="Ícones, ordem e exibição das ações do menu dos apps" open={open} onToggle={() => setOpen(!open)} />
    {open && <div className="grid gap-6 p-4 sm:grid-cols-2"><div><DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={move}><SortableContext items={config.order} strategy={verticalListSortingStrategy}>{config.order.map((id) => <MenuRow key={id} id={id} checked={!config.hidden.includes(id)} onChange={() => setDraft({ ...config, hidden: config.hidden.includes(id) ? config.hidden.filter((v) => v !== id) : [...config.hidden, id] })} />)}</SortableContext></DndContext><Button variant="action" className="mt-3" onClick={save} disabled={saving || !draft}><Save className="h-4 w-4" />Salvar</Button></div>
      <div className="space-y-3"><h3 className="text-sm font-semibold">Prévia</h3><div className="max-w-72 overflow-hidden rounded-lg border border-border">{config.order.filter((id) => !config.hidden.includes(id)).map((id) => { const item = MENU_ITEMS.find((i) => i.id === id); if (!item) return null; const Icon = item.icon; return <div key={id} className="flex items-center gap-3 px-4 py-3 text-sm"><Icon className="h-5 w-5" />{item.label}</div>; })}</div></div>
    </div>}
  </section>;
}