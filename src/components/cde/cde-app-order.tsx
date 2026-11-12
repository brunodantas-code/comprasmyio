import { CdeNumber } from "@/components/cde/cde-button";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Minus, Plus, Save } from "lucide-react";
import { APP_DESCRIPTIONS, AppSymbol, AppTileFace } from "./app-tile";
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
    <CdeNumber screen="components/cde/cde-app-order.tsx">{index + 1}</CdeNumber>
    <span className="flex h-7 w-7 shrink-0 items-center justify-center text-foreground"><AppSymbol name={app?.name ?? ""} className="h-5 w-5" /></span>
    <span className="flex-1 text-sm">{app?.name}</span>
  </div>;
}

export function CdeAppOrder({ number, handle }: { number: number; handle?: import("react").ReactNode }) {
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
    <CdeCategoryHeader handle={handle} number={number} title="Apps da página principal" hint="Ordem, fonte, tamanho e espaçamento" open={open} onToggle={() => setOpen(!open)} />
    {open && <div className="w-full min-w-0 py-4"><DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={move}><SortableContext items={order} strategy={verticalListSortingStrategy}>{order.map((id, i) => <Row key={id} id={id} index={i} />)}</SortableContext></DndContext>
      <Button variant="action" className="mt-3" onClick={save} disabled={saving || !draft}><Save className="h-4 w-4" />Salvar</Button>
      <div className="mt-6 space-y-3 border-t border-border pt-4">
        <p className="text-sm font-medium">Ícones da página principal</p>
        <div role="group" aria-label="Ajustes dos ícones da página principal" className="grid w-full max-w-5xl grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="min-w-0 space-y-1"><Label className="flex min-h-10 items-end pb-1">Fonte do nome</Label><Select value={String(tile.labelPx)} onValueChange={(v) => setTileDraft({ ...tile, labelPx: Number(v) })}><SelectTrigger className="h-9"><SelectValue /></SelectTrigger><SelectContent>{[11, 12, 13, 14, 15, 16].map((n) => <SelectItem key={n} value={String(n)}>{n} px</SelectItem>)}</SelectContent></Select></div>
          <div className="min-w-0 space-y-1"><Label className="flex min-h-10 items-end pb-1">Ícone</Label>
            <div className="grid h-9 w-36 grid-cols-[2rem_5rem_2rem] items-center justify-items-center">
              <Button variant="outline" size="compactIcon" aria-label="Diminuir ícone" title="Diminuir" disabled={tile.tilePct <= 70} onClick={() => setTileDraft({ ...tile, tilePct: tile.tilePct - 5 })}><Minus /></Button>
              <span className="w-20 text-center text-sm tabular-nums">{tile.tilePct}%</span>
              <Button variant="outline" size="compactIcon" aria-label="Aumentar ícone" title="Aumentar" disabled={tile.tilePct >= 140} onClick={() => setTileDraft({ ...tile, tilePct: tile.tilePct + 5 })}><Plus /></Button>
            </div></div>
          <div className="min-w-0 space-y-1"><Label className="flex min-h-10 items-end pb-1">Símbolo interno</Label>
            <div className="grid h-9 w-36 grid-cols-[2rem_5rem_2rem] items-center justify-items-center">
              <Button variant="outline" size="compactIcon" aria-label="Diminuir símbolo" title="Diminuir" disabled={tile.iconPct <= 60} onClick={() => setTileDraft({ ...tile, iconPct: tile.iconPct - 5 })}><Minus /></Button>
              <span className="w-20 text-center text-sm tabular-nums">{tile.iconPct}%</span>
              <Button variant="outline" size="compactIcon" aria-label="Aumentar símbolo" title="Aumentar" disabled={tile.iconPct >= 140} onClick={() => setTileDraft({ ...tile, iconPct: tile.iconPct + 5 })}><Plus /></Button>
            </div></div>
          {([['gapX', 'Espaçamento horizontal'], ['gapY', 'Espaçamento vertical']] as const).map(([key, label]) => <div key={key} className="min-w-0 space-y-1"><Label className="flex min-h-10 items-end pb-1">{label}</Label><div className="grid h-9 w-36 grid-cols-[2rem_5rem_2rem] items-center justify-items-center">
            <Button variant="outline" size="compactIcon" aria-label={`Diminuir ${label.toLowerCase()}`} title="Diminuir" disabled={tile[key] <= 8} onClick={() => setTileDraft({ ...tile, [key]: Math.max(8, tile[key] - 4) })}><Minus /></Button>
            <span className="w-20 text-center text-sm tabular-nums">{tile[key]} px</span>
            <Button variant="outline" size="compactIcon" aria-label={`Aumentar ${label.toLowerCase()}`} title="Aumentar" disabled={tile[key] >= 80} onClick={() => setTileDraft({ ...tile, [key]: Math.min(80, tile[key] + 4) })}><Plus /></Button>
          </div></div>)}
        </div>
        <div className="space-y-1"><Label>Prévia desktop</Label>
          <div aria-label="Prévia dos apps" style={{ columnGap: tile.gapX, rowGap: tile.gapY }} className="flex w-full flex-wrap bg-background py-10 sm:py-14">
            {order.map((key) => { const app = PORTAL_APPS.find((a) => a.key === key); return app ? <div key={key} style={{ zoom: tile.tilePct / 100 }} className="flex w-20 min-w-0 flex-col items-center text-center sm:w-28">
              <div className="relative flex h-20 w-20 flex-col items-center justify-between rounded-2xl border-2 border-primary bg-primary px-1.5 pb-2 pt-1 text-primary-foreground sm:h-28 sm:w-28 sm:rounded-3xl sm:px-2 sm:pt-1.5"><AppTileFace appKey={key} name={app.name} tile={tile} /></div>
              <p className="mt-2 w-20 max-w-full break-words text-center text-[0.68rem] leading-4 text-muted-foreground sm:mt-3 sm:w-28 sm:text-sm sm:leading-5">{APP_DESCRIPTIONS[key]?.map(line => <span key={line} className="block sm:whitespace-nowrap">{line}</span>)}</p>
            </div> : null; })}
          </div></div>
        <div className="space-y-1"><Label>Prévia mobile</Label>
          <div aria-label="Prévia mobile dos apps" className="mobile-app-grid grid w-full max-w-[390px] bg-background px-3 py-8">
            {order.map(key => { const app = PORTAL_APPS.find(a => a.key === key); return app ? <div key={key} className="flex min-w-0 flex-col items-center text-center">
              <div className="mobile-app-tile relative flex flex-col items-center justify-between rounded-2xl border-2 border-primary bg-primary px-1 pb-2 pt-1 text-primary-foreground"><AppTileFace appKey={key} name={app.name} tile={tile} mobile /></div>
              <p className="mt-2 w-full break-words text-center text-[0.68rem] leading-4 text-muted-foreground">{APP_DESCRIPTIONS[key]?.map(line => <span key={line} className="block">{line}</span>)}</p>
            </div> : null; })}
          </div>
        </div>
        <p className="text-xs text-muted-foreground">No celular, a fonte fica 2 px menor. Os símbolos mais finos recebem correção automática para parecerem do mesmo tamanho.</p>
        <div className="flex items-center gap-2"><Button variant="action" onClick={saveTile} disabled={saving || !tileDraft}><Save className="h-4 w-4" />Salvar</Button>
          {tileDraft && <Button variant="action" disabled={saving} onClick={() => setTileDraft(null)}>Cancelar</Button>}
        </div>
      </div></div>}
  </section>;
}
