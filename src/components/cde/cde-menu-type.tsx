import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Item = { label: string; icon: React.ComponentType<{ className?: string }> };
export const MENU_TYPES = [
  { key: "bottom", label: "Barra inferior" },
  { key: "bottom_fab", label: "Barra inferior com botão flutuante" },
  { key: "top_tabs", label: "Abas superiores" },
  { key: "left", label: "Menu lateral esquerdo" },
  { key: "right", label: "Menu lateral direito" },
  { key: "hamburger", label: "Dentro do menu de 3 barras" },
] as const;
type MenuType = typeof MENU_TYPES[number]["key"];
const GROUP = "menu_type";

function useMenuTypes() {
  return useQuery({ queryKey: ["cde-menu-type"], queryFn: async () => {
    const { data } = await supabase.from("cde_selected").select("variant_key").eq("group_key", GROUP).eq("is_primary", true).maybeSingle();
    try { return JSON.parse(data?.variant_key ?? "{}") as Record<string, MenuType>; } catch { return {}; }
  } });
}

function Preview({ type, items }: { type: MenuType; items: Item[] }) {
  const icons = items.slice(0, 5);
  const btn = (it: Item, i: number, row = false) => { const I = it.icon; return <span key={i} className={`flex ${row ? "flex-row gap-1.5" : "flex-col"} items-center gap-0.5 text-[8px] ${i === 0 ? "text-primary" : "text-muted-foreground"}`}><I className="h-3.5 w-3.5" /><span className="truncate">{it.label}</span></span>; };
  const header = <div className="flex h-5 items-center justify-between border-b border-border px-2"><span className="h-1.5 w-8 rounded bg-primary/60" /><span className="h-1.5 w-4 rounded bg-muted-foreground/40" /></div>;
  const body = <div className="flex-1 space-y-1 p-2"><div className="h-1.5 w-2/3 rounded bg-muted" /><div className="h-1.5 w-1/2 rounded bg-muted" /><div className="h-1.5 w-3/4 rounded bg-muted" /></div>;
  const side = <div className="flex w-20 flex-col gap-1.5 border-border bg-muted/40 p-1.5">{icons.map((it, i) => btn(it, i, true))}</div>;
  return <div className="relative flex h-36 w-60 flex-col overflow-hidden rounded-lg border border-border bg-background">
    {header}
    {type === "top_tabs" ? <div className="flex justify-around border-b border-border py-1">{icons.map((it, i) => btn(it, i))}</div> : null}
    <div className="flex min-h-0 flex-1">{type === "left" ? <div className="border-r border-border">{side}</div> : null}{body}{type === "right" ? <div className="border-l border-border">{side}</div> : null}</div>
    {type === "bottom" || type === "bottom_fab" ? <div className="m-1.5 flex justify-around rounded-full border border-border bg-card py-1">{icons.map((it, i) => btn(it, i))}</div> : null}
    {type === "bottom_fab" ? <span className="absolute bottom-10 right-3 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">+</span> : null}
    {type === "hamburger" ? <div className="absolute right-1 top-5 w-24 space-y-1 rounded border border-border bg-card p-1.5 shadow">{icons.map((it, i) => btn(it, i, true))}</div> : null}
  </div>;
}

/** Records each app's main-menu type with a live preview (registration only; layouts change on request). */
export function CdeMenuType({ app, items }: { app: string; items: Item[] }) {
  const qc = useQueryClient();
  const { data } = useMenuTypes();
  const saved: MenuType = data?.[app] ?? "bottom";
  const [draft, setDraft] = useState<MenuType | null>(null);
  const type: MenuType = draft ?? saved;
  const dirty = draft !== null && draft !== saved;
  async function save() {
    if (!draft) return;
    const all = { ...(data ?? {}), [app]: draft };
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error();
      const existing = await supabase.from("cde_selected").select("variant_key").eq("group_key", GROUP).eq("is_primary", true).maybeSingle();
      const row = { variant_key: JSON.stringify(all), chosen_by: user.id };
      const r = existing.data ? await supabase.from("cde_selected").update(row).eq("group_key", GROUP).eq("variant_key", existing.data.variant_key) : await supabase.from("cde_selected").insert({ ...row, group_key: GROUP });
      if (r.error) throw r.error;
      toast.success("Tipo de menu registrado"); setDraft(null);
    } catch { toast.error("Não foi possível salvar (somente Admin)."); } finally { qc.invalidateQueries({ queryKey: ["cde-menu-type"] }); }
  }
  return <div className="flex flex-wrap items-start gap-4">
    <div className="space-y-1"><div className="text-xs text-muted-foreground">Tipo de menu</div>
      <Select value={type} onValueChange={(v) => setDraft(v as MenuType)}><SelectTrigger className="h-8 w-64 text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>{MENU_TYPES.map((t) => <SelectItem key={t.key} value={t.key} className="text-xs">{t.label}</SelectItem>)}</SelectContent></Select></div>
    <Preview type={type} items={items} />
    {dirty ? <div className="flex items-end gap-2 self-end"><Button type="button" size="sm" variant="outline" onClick={() => setDraft(null)}>Cancelar</Button><Button type="button" size="sm" variant="outline" onClick={save}>Salvar</Button></div> : null}
  </div>;
}
