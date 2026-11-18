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
import { AppSymbol } from "@/components/cde/app-tile";
import { FAVORITE_APPS, FAVORITE_LIMIT, normalizeFavorites, toggleFavorite, useMobileFavorites } from "./mobile-favorites-config";

function FavoriteRow({ id, selected, full, onToggle }: { id: string; selected: boolean; full: boolean; onToggle: () => void }) {
  const app = FAVORITE_APPS.find(a => a.key === id);
  const { setNodeRef, attributes, listeners, transform, transition } = useSortable({ id, disabled: !selected });
  if (!app) return null;
  return <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className="flex items-center gap-3 border-b border-border bg-card py-2"><Button variant="ghost" size="icon" disabled={!selected} title={`Mover ${app.name}`} aria-label={`Mover ${app.name}`} className="touch-none" {...attributes} {...listeners}><GripVertical /></Button><AppSymbol name={app.name} className="size-5" /><span className="flex-1 text-sm">{app.name}</span><Button variant="ghost" size="icon" aria-pressed={selected} disabled={!selected && full} title={selected ? `Remover ${app.name} dos favoritos` : `Favoritar ${app.name}`} aria-label={selected ? `Remover ${app.name} dos favoritos` : `Favoritar ${app.name}`} onClick={onToggle}><Star className={selected ? "fill-primary text-primary" : "text-foreground"} /></Button></div>;
}
function FavoritesExperience() {
  const { data, isError } = useMobileFavorites();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<string[] | null>(null);
  const [saving, setSaving] = useState(false);
  const keys = draft ?? data?.keys ?? [];
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  useEffect(() => { const show = () => { setDraft(null); setOpen(true); }; window.addEventListener("open-mobile-favorites", show); return () => window.removeEventListener("open-mobile-favorites", show); }, []);
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
  return <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-h-[85dvh] overflow-hidden"><DialogHeader><DialogTitle>Meus favoritos</DialogTitle></DialogHeader><div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">{keys.length} / {FAVORITE_LIMIT}</span><Button variant="ghost" size="icon" title="Salvar meus favoritos" aria-label="Salvar meus favoritos" onClick={save} disabled={!data || saving || !draft}><Save /></Button></div>{isError ? <p>Não foi possível carregar seus aplicativos.</p> : !data ? <p>Carregando...</p> : <div className="max-h-[55dvh] overflow-y-auto"><DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={move}><SortableContext items={keys} strategy={verticalListSortingStrategy}>{apps.map(id => <FavoriteRow key={id} id={id} selected={keys.includes(id)} full={keys.length >= FAVORITE_LIMIT} onToggle={() => setDraft(toggleFavorite(keys, id))} />)}</SortableContext></DndContext></div>}</DialogContent></Dialog>;
}
export function MobileFavorites() {
  const path = useRouterState({ select: state => state.location.pathname });
  const protectedPath = ["/portal", "/acessos", "/pendentes", ...FAVORITE_APPS.map(a => a.to)].some(p => path === p || path.startsWith(`${p}/`));
  return protectedPath ? <FavoritesExperience /> : null;
}