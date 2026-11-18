import { useEffect, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { DndContext, PointerSensor, KeyboardSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, useSortable, arrayMove, verticalListSortingStrategy, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Save, Star } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AppAccessLink } from "@/components/app-access-link";
import { AppSymbol, AppTileFace } from "@/components/cde/app-tile";
import { APP_TILE_DEFAULT, appTileColorVars, mobileTileVars, useAppTile } from "@/components/cde/app-order-config";
import { mobileDockVars, useMobileDockStyle } from "@/components/cde/mobile-dock-style";
import { FAVORITE_APPS, FAVORITE_LIMIT, normalizeFavorites, toggleFavorite, useMobileFavorites } from "./mobile-favorites-config";

function FavoriteRow({ id, selected, full, onToggle }: { id: string; selected: boolean; full: boolean; onToggle: () => void }) {
  const app = FAVORITE_APPS.find(a => a.key === id);
  const { setNodeRef, attributes, listeners, transform, transition } = useSortable({ id, disabled: !selected });
  if (!app) return null;
  return <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className="flex items-center gap-3 border-b border-border bg-card py-2"><Button variant="ghost" size="icon" disabled={!selected} title={`Mover ${app.name}`} aria-label={`Mover ${app.name}`} className="touch-none" {...attributes} {...listeners}><GripVertical /></Button><AppSymbol name={app.name} className="size-5" /><span className="flex-1 text-sm">{app.name}</span><Button variant="ghost" size="icon" aria-pressed={selected} disabled={!selected && full} title={selected ? `Remover ${app.name} dos favoritos` : `Favoritar ${app.name}`} aria-label={selected ? `Remover ${app.name} dos favoritos` : `Favoritar ${app.name}`} onClick={onToggle}><Star className={selected ? "fill-primary text-primary" : "text-foreground"} /></Button></div>;
}
function FavoritesExperience() {
  const { data, isError } = useMobileFavorites();
  const tile = useAppTile().data ?? APP_TILE_DEFAULT;
  const dock = useMobileDockStyle().data;
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<string[] | null>(null);
  const [saving, setSaving] = useState(false);
  const keys = draft ?? data?.keys ?? [];
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  useEffect(() => { const show = () => { setDraft(null); setOpen(true); }; window.addEventListener("open-mobile-favorites", show); return () => window.removeEventListener("open-mobile-favorites", show); }, []);
  useEffect(() => { document.documentElement.classList.toggle("has-mobile-favorites", Boolean(data?.keys.length)); return () => document.documentElement.classList.remove("has-mobile-favorites"); }, [data?.keys.length]);
  async function save() {
    if (!data) return;
    setSaving(true);
    try {
      const selected = normalizeFavorites(keys, data.allowed);
      const result = await supabase.from("mobile_app_favorites").upsert({ user_id: data.id, app_keys: selected, updated_at: new Date().toISOString() }).select("app_keys").single();
      if (result.error || JSON.stringify(result.data?.app_keys) !== JSON.stringify(selected)) throw new Error("Não salvo");
      await qc.invalidateQueries({ queryKey: ["mobile-app-favorites"] }); setDraft(null); setOpen(false); toast.success("Seus favoritos foram salvos");
    } catch { toast.error("Não foi possível salvar seus favoritos"); } finally { setSaving(false); }
  }
  function move(e: DragEndEvent) { if (!e.over) return; const from = keys.indexOf(String(e.active.id)), to = keys.indexOf(String(e.over.id)); if (from >= 0 && to >= 0) setDraft(arrayMove(keys, from, to)); }
  const apps = data ? [...keys, ...data.allowed.filter(k => !keys.includes(k))].filter(k => FAVORITE_APPS.some(a => a.key === k)) : [];
  return <><Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-h-[85dvh] overflow-hidden"><DialogHeader><DialogTitle>Meus favoritos</DialogTitle></DialogHeader><div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">{keys.length} / {FAVORITE_LIMIT}</span><Button variant="ghost" size="icon" title="Salvar meus favoritos" aria-label="Salvar meus favoritos" onClick={save} disabled={!data || saving || !draft}><Save /></Button></div>{isError ? <p>Não foi possível carregar seus aplicativos.</p> : !data ? <p>Carregando...</p> : <div className="max-h-[55dvh] overflow-y-auto"><DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={move}><SortableContext items={keys} strategy={verticalListSortingStrategy}>{apps.map(id => <FavoriteRow key={id} id={id} selected={keys.includes(id)} full={keys.length >= FAVORITE_LIMIT} onToggle={() => setDraft(toggleFavorite(keys, id))} />)}</SortableContext></DndContext></div>}</DialogContent></Dialog>{data?.keys.length ? <nav aria-label="Aplicativos favoritos" className="mobile-favorites-dock sm:hidden" style={{ ...mobileDockVars(dock), ...appTileColorVars(tile), ...mobileTileVars(tile) }}><div className="mobile-favorites-band grid grid-cols-4 items-center gap-2 p-3">{data.keys.map(key => { const app = FAVORITE_APPS.find(a => a.key === key); return app ? <AppAccessLink key={key} appKey={key} to={app.to} title={`Acessar ${app.name}`} aria-label={`Favorito ${app.name}`} className="favorite-app-tile relative flex min-w-0 flex-col items-center justify-between rounded-2xl border-2 border-[color:var(--tile-border)] bg-[var(--tile-fill)] px-1 pb-2 pt-1"><AppTileFace appKey={key} name={app.name} tile={tile} mobile /></AppAccessLink> : null; })}</div></nav> : null}</>;
}
export function MobileFavorites() {
  const path = useRouterState({ select: state => state.location.pathname });
  const protectedPath = ["/portal", "/acessos", "/pendentes", ...FAVORITE_APPS.map(a => a.to)].some(p => path === p || path.startsWith(`${p}/`));
  return protectedPath ? <FavoritesExperience /> : null;
}