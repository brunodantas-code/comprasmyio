import { useState } from "react";
import { Save, Check, Smartphone, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MENU_TYPES, resolveMenus, menuMainClasses, type MenuType, type MenuConfig } from "./menu-layout";
import { applyMenuNames } from "./menu-names";
import { useMenuNames } from "./use-menu-names";
export { MENU_TYPES } from "./menu-layout";
type Item = { label: string; icon: React.ComponentType<{ className?: string }> };
const GROUP = "menu_type";
export function useMenuTypes() {
  return useQuery({ queryKey: ["cde-menu-type"], queryFn: async () => {
    const { data, error } = await supabase.from("cde_selected").select("variant_key").eq("group_key", GROUP).eq("is_primary", true).maybeSingle();
    if (error) throw error;
    try { const value: unknown = JSON.parse(data?.variant_key ?? "{}"); return value && typeof value === "object" && !Array.isArray(value) ? value as MenuConfig : {}; } catch { return {}; }
  } });
}
function Preview({ type, items }: { type: MenuType; items: Item[] }) {
  const icons = items.slice(0, 4);
  const fixed = type === "left" || type === "right" || type === "bottom";
  const btn = (it: Item, i: number, row = false) => { const I = it.icon; return <span key={i} className={`flex min-w-0 ${row ? "flex-row gap-1" : "flex-col"} items-center gap-0.5 text-[8px] ${fixed ? `app-menu-fixed-preview-item ${i === 0 ? "app-menu-fixed-preview-active" : ""} rounded p-1` : i === 0 ? "text-primary" : "text-muted-foreground"}`}><I className="size-3 shrink-0" /><span className="max-w-full truncate">{it.label}</span></span>; };
  return <div aria-label={`Prévia ${MENU_TYPES.find(t => t.key === type)?.label}`} className="relative flex h-36 w-full max-w-60 flex-col overflow-hidden rounded-md border border-border bg-background">
    <div className="flex h-5 shrink-0 items-center justify-between border-b border-border px-2"><span className="h-1.5 w-8 rounded bg-primary/60" /><span className="h-1.5 w-4 rounded bg-muted-foreground/40" /></div>
    {type === "top_tabs" && <div className="flex justify-around border-b border-border py-1">{icons.map((it,i)=>btn(it,i))}</div>}
    <div className="relative flex min-h-0 flex-1">
      {(type === "left" || type === "right") && <div data-preview-side={type} className={`app-menu-fixed-preview absolute inset-y-0 z-10 flex w-20 flex-col gap-2 p-1.5 ${type === "left" ? "left-0" : "right-0"}`}>{icons.map((it,i)=>btn(it,i,true))}</div>}
      <div className={`min-w-0 flex-1 space-y-2 p-2 ${type === "left" ? "ml-20" : type === "right" ? "mr-20" : ""}`}><div className="h-1.5 w-2/3 rounded bg-muted" /><div className="h-1.5 w-1/2 rounded bg-muted" /><div className="h-1.5 w-3/4 rounded bg-muted" /></div>
    </div>
    {(type === "bottom" || type === "floating") && <div data-preview-base={type} className={`flex shrink-0 justify-around py-2 ${type === "floating" ? "mx-2 mb-2 rounded-full border border-border bg-card shadow-md" : "app-menu-fixed-preview w-full"}`}>{icons.map((it,i)=>btn(it,i))}</div>}
  </div>;
}
export function CdeMenuType({ app, items, cards = false }: { app: string; items: Item[]; cards?: boolean }) {
  const qc = useQueryClient(); const { data } = useMenuTypes();
  const { data: names } = useMenuNames();
  const previewItems = applyMenuNames(items, names, app, app === "Projects" ? "Seções do projeto" : "Barra inferior");
  const [device, setDevice] = useState<"mobile" | "desktop">("mobile");
  const [draft, setDraft] = useState<Partial<Record<"mobile" | "desktop", MenuType>>>({}); const [busy,setBusy] = useState(false);
  const saved = resolveMenus(data ?? {}, app); const type = draft[device] ?? saved[device];
  const dirty = !!Object.keys(draft).length;
  async function save() {
    setBusy(true);
    try {
      const user = (await supabase.auth.getUser()).data.user; if (!user) throw new Error("Sessão não encontrada");
      const existing = await supabase.from("cde_selected").select("variant_key").eq("group_key",GROUP).eq("is_primary",true).maybeSingle(); if(existing.error) throw existing.error;
      const all: MenuConfig = JSON.parse(existing.data?.variant_key ?? "{}");
      const key = app === "Finance" ? "Cash Flow" : app;
      if(app === "*") { for(const k of Object.keys(all)) all[k] = {...resolveMenus(all,k),...draft}; }
      all[key] = {...resolveMenus(all,app),...draft};
      const row = { variant_key:JSON.stringify(all), chosen_by:user.id };
      const r = existing.data ? await supabase.from("cde_selected").update(row).eq("group_key",GROUP).eq("is_primary",true).eq("variant_key",existing.data.variant_key).select("variant_key").single() : await supabase.from("cde_selected").insert({...row,group_key:GROUP,is_primary:true}).select("variant_key").single();
      if(r.error) throw r.error; await qc.invalidateQueries({queryKey:["cde-menu-type"]}); setDraft({}); toast.success("Menus atualizados nos apps");
    } catch(e) { toast.error(e instanceof Error ? e.message : "Não foi possível salvar"); } finally {setBusy(false);}
  }
  return <div className="space-y-3">
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3"><div role="group" aria-label={`Versão do menu ${app}`} className="flex min-w-0 gap-2">{([{key:"mobile",label:"Mobile",icon:Smartphone},{key:"desktop",label:"Desktop",icon:Monitor}] as const).map(({key,label,icon:Icon})=><Button key={key} variant="ghost" aria-pressed={device===key} onClick={()=>setDevice(key)}><Icon />{label}{device===key && <Check className="size-3" />}</Button>)}</div><Button variant="ghost" size="compactIcon" aria-label={`Salvar menus ${app}`} title="Salvar menus Mobile e Desktop" disabled={busy || !dirty} onClick={save}><Save /></Button></div>
    {cards ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{MENU_TYPES.map(t=><div key={t.key} className={`flex min-w-0 flex-col gap-3 rounded-lg border p-3 ${type===t.key ? "border-primary bg-accent" : "border-border"}`}><Preview type={t.key} items={previewItems} /><h3 className="text-sm">{t.label}</h3><Button variant="ghost" disabled={busy} aria-pressed={type===t.key} onClick={()=>setDraft(d=>({...d,[device]:t.key}))}>{type===t.key ? <><Check />Selecionado</> : "Selecionar"}</Button></div>)}</div> : <div className="flex flex-wrap items-start gap-4"><Select value={type} onValueChange={v=>{const t=MENU_TYPES.find(t=>t.key===v);if(t)setDraft(d=>({...d,[device]:t.key}));}}><SelectTrigger aria-label={`Tipo de menu ${device} ${app}`} className="w-64 max-w-full"><SelectValue /></SelectTrigger><SelectContent>{MENU_TYPES.map(t=><SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>)}</SelectContent></Select><div className="w-60 max-w-full"><Preview type={type} items={previewItems} /></div></div>}
  </div>;
}
export function useAppMenuLayout(app: string) {
  const menus = resolveMenus(useMenuTypes().data ?? {},app);
  const side = menus.desktop === "left" || menus.desktop === "right" ? menus.desktop : null;
  return {menus, side, nav:`menu-mobile-${menus.mobile} menu-desktop-${menus.desktop}`,grid:"",main:menuMainClasses(menus),drop:(side === "left" ? "right" : side === "right" ? "left" : menus.desktop === "top_tabs" ? "bottom" : "top") as "top"|"bottom"|"left"|"right"};
}
export function useAppMenuSide(app:string) {return useAppMenuLayout(app).side;}
