import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, FileText, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { CdeColorSwatches } from "./top-icon-style-editor";

/** Style of list-type menu items (submenus and 3-bar menu), stored in cde_selected group list_item_style. */
export type ListItemStyle = { fg: string; text: string; hl: string };
const DEF: ListItemStyle = { fg: "", text: "", hl: "" };
const GROUP = "list_item_style";


function useListItemStyle() {
  return useQuery({ queryKey: ["cde-list-item-style"], queryFn: async () => {
    const { data } = await supabase.from("cde_selected").select("variant_key").eq("group_key", GROUP).eq("is_primary", true).maybeSingle();
    try { return { ...DEF, ...JSON.parse(data?.variant_key ?? "{}") } as ListItemStyle; } catch { return DEF; }
  } });
}
function vars(s: ListItemStyle): Record<string, string> {
  const v: Record<string, string> = {};
  if (s.fg) v["--li-fg"] = s.fg; if (s.text) v["--li-text"] = s.text; if (s.hl) v["--li-hl"] = s.hl;
  return v;
}
/** Applies the saved list-item rule to every [role=menuitem] in all apps. */
export function ListItemStyleVars() {
  const { data } = useListItemStyle();
  useEffect(() => {
    if (!data) return;
    const r = document.documentElement;
    ["--li-fg", "--li-text", "--li-hl"].forEach((k) => r.style.removeProperty(k));
    Object.entries(vars(data)).forEach(([k, v]) => r.style.setProperty(k, v));
  }, [data]);
  return null;
}

export function ListItemStyleEditor() {
  const qc = useQueryClient();
  const { data } = useListItemStyle();
  const [draft, setDraft] = useState<ListItemStyle | null>(null);
  const s = draft ?? data ?? DEF;
  const set = (p: Partial<ListItemStyle>) => setDraft({ ...s, ...p });
  async function save() {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error();
      const ex = await supabase.from("cde_selected").select("variant_key").eq("group_key", GROUP).eq("is_primary", true).maybeSingle();
      const row = { variant_key: JSON.stringify(s), chosen_by: user.id };
      const r = ex.data ? await supabase.from("cde_selected").update(row).eq("group_key", GROUP).eq("variant_key", ex.data.variant_key) : await supabase.from("cde_selected").insert({ ...row, group_key: GROUP });
      if (r.error) throw r.error;
      await qc.invalidateQueries({ queryKey: ["cde-list-item-style"] });
      setDraft(null); toast.success("Regra dos itens de lista aplicada a todos os apps");
    } catch { toast.error("Não foi possível salvar (somente Admin)."); }
  }
  const rows = [{ l: "Nova visita", I: Plus }, { l: "Histórico de Visitas", I: FileText, hover: true }, { l: "Realizar Visita", I: Check }];
  return <div className="space-y-3">
    <div className="w-56 rounded-lg border border-border bg-card p-1.5 shadow" style={vars(s) as React.CSSProperties}>{rows.map(({ l, I, hover }) => <div key={l} role="menuitem" data-preview-hl={hover ? "" : undefined} className="flex items-center gap-2 rounded-md px-2 py-2 text-sm"><I className="h-4 w-4" />{l}</div>)}</div>
    <div className="grid gap-3 sm:grid-cols-3">
      <CdeColorSwatches label="Cor do símbolo" value={s.fg} onChange={(fg) => set({ fg })} />
      <CdeColorSwatches label="Cor do texto" value={s.text} onChange={(text) => set({ text })} />
      <CdeColorSwatches label="Destaque da linha" value={s.hl} onChange={(hl) => set({ hl })} />
    </div>
    {draft ? <div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => setDraft(null)}>Cancelar</Button><Button size="sm" variant="outline" onClick={save}>Salvar</Button></div> : null}
  </div>;
}
