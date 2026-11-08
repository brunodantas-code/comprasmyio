import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { CdeCategoryHeader } from "./cde-category-header";
import { APP_TILE_DEFAULT, PORTAL_APPS, parseAppOrder, useAppOrder, useAppTile, type AppTileConfig } from "./app-order-config";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

function Row({ id, index }: { id: string; index: number }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const app = PORTAL_APPS.find((a) => a.key === id);
  return <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className="flex items-center gap-3 border-b border-border bg-card py-2">
    <Button variant="ghost" size="compactIcon" aria-label={`Mover ${app?.name}`} title={`Mover ${app?.name}`} {...attributes} {...listeners} className="touch-none"><GripVertical /></Button>
    <span className="w-5 text-xs text-muted-foreground">{index + 1}</span><span className="flex-1 text-sm">{app?.name}</span>
  </div>;
}

export function CdeAppOrder({ number }: { number: number }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<string[] | null>(null);
  const [saving, setSaving] = useState(false);
  const { data } = useAppOrder();
  const qc = useQueryClient();
  const savedTile = useAppTile().data ?? APP_TILE_DEFAULT;
  const [tileDraft, setTileDraft] = useState<AppTileConfig | null>(null);
  const tile = tileDraft ?? savedTile;
  async function saveTile() {
    setSaving(true);
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error("Sessão não encontrada");
      const existing = await supabase.from("cde_selected").select("variant_key").eq("group_key", "app_tile").eq("is_primary", true).maybeSingle();
      if (existing.error) throw existing.error;
      const row = { variant_key: JSON.stringify(tile), chosen_by: user.id };
      const result = existing.data ? await supabase.from("cde_selected").update(row).eq("group_key", "app_tile").eq("variant_key", existing.data.variant_key) : await supabase.from("cde_selected").insert({ ...row, group_key: "app_tile" });
      if (result.error) throw result.error;
      await qc.invalidateQueries({ queryKey: ["cde-app-tile"] });
      setTileDraft(null); toast.success("Padrão dos ícones atualizado");
    } catch { toast.error("Não foi possível salvar o padrão."); } finally { setSaving(false); }
  }
  const order = draft ?? data ?? parseAppOrder();
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  function move(e: DragEndEvent) {
    if (!e.over || e.active.id === e.over.id) return;
    setDraft(arrayMove(order, order.indexOf(String(e.active.id)), order.indexOf(String(e.over.id))));
  }
  async function save() {
    setSaving(true);
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error("Sessão não encontrada");
      const existing = await supabase.from("cde_selected").select("variant_key").eq("group_key", "app_order").eq("is_primary", true).maybeSingle();
      if (existing.error) throw existing.error;
      const row = { variant_key: JSON.stringify(order), chosen_by: user.id };
      const result = existing.data ? await supabase.from("cde_selected").update(row).eq("group_key", "app_order").eq("variant_key", existing.data.variant_key) : await supabase.from("cde_selected").insert({ ...row, group_key: "app_order" });
      if (result.error) throw result.error;
      await qc.invalidateQueries({ queryKey: ["cde-app-order"] });
      setDraft(null); toast.success("Ordem dos apps atualizada");
    } catch { toast.error("Não foi possível salvar a ordem."); } finally { setSaving(false); }
  }
  return <section className="space-y-4">
    <CdeCategoryHeader number={number} title="Apps da página principal" hint="Ordem, fonte do nome e tamanho dos símbolos" open={open} onToggle={() => setOpen(!open)} />
    {open && <div className="max-w-md p-4"><DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={move}><SortableContext items={order} strategy={verticalListSortingStrategy}>{order.map((id, i) => <Row key={id} id={id} index={i} />)}</SortableContext></DndContext>
      <Button variant="action" className="mt-3" onClick={save} disabled={saving || !draft}><Save className="h-4 w-4" />Salvar</Button>
      <div className="mt-6 space-y-3 border-t border-border pt-4">
        <p className="text-sm font-medium">Ícones da página principal</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1"><Label>Fonte do nome</Label><Select value={String(tile.labelPx)} onValueChange={(v) => setTileDraft({ ...tile, labelPx: Number(v) })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{[11, 12, 13, 14, 15, 16].map((n) => <SelectItem key={n} value={String(n)}>{n} px</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-1"><Label>Tamanho do símbolo</Label><Select value={String(tile.iconPct)} onValueChange={(v) => setTileDraft({ ...tile, iconPct: Number(v) })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{[80, 90, 100, 110].map((n) => <SelectItem key={n} value={String(n)}>{n}%</SelectItem>)}</SelectContent></Select></div>
        </div>
        <p className="text-xs text-muted-foreground">No celular, a fonte fica 2 px menor. Os símbolos mais finos recebem correção automática para parecerem do mesmo tamanho.</p>
        <Button variant="action" onClick={saveTile} disabled={saving || !tileDraft}><Save className="h-4 w-4" />Salvar</Button>
      </div></div>}
  </section>;
}
