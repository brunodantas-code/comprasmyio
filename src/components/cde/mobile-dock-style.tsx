import { useState, type CSSProperties } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ColorSelect } from "./cde-tags";
import { AppSymbol } from "./app-tile";
import { tagColor } from "./tag-style";

type DockStyle = { bg: string; border: string };
const DEFAULT: DockStyle = { bg: "verde_claro_myio", border: "cinza_claro" };
export function useMobileDockStyle() {
  return useQuery({ queryKey: ["cde-mobile-dock"], queryFn: async () => {
    const { data, error } = await supabase.from("cde_selected").select("variant_key").eq("group_key", "mobile_dock").eq("is_primary", true).maybeSingle();
    if (error) throw error;
    try { const p = JSON.parse(data?.variant_key ?? "{}"); return { bg: p.bg ?? DEFAULT.bg, border: p.border ?? DEFAULT.border } as DockStyle; } catch { return DEFAULT; }
  } });
}
export function mobileDockVars(style?: DockStyle): CSSProperties {
  const c = style ?? DEFAULT;
  return { "--dock-bg": tagColor(c.bg).value || "var(--accent)", "--dock-border": tagColor(c.border).value || "var(--border)" } as CSSProperties;
}
export function CdeMobileDockStyle() {
  const saved = useMobileDockStyle().data ?? DEFAULT;
  const [draft, setDraft] = useState<DockStyle | null>(null);
  const [saving, setSaving] = useState(false);
  const qc = useQueryClient();
  const c = draft ?? saved;
  async function save() {
    setSaving(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Sessão não encontrada");
      const existing = await supabase.from("cde_selected").select("variant_key").eq("group_key", "mobile_dock").eq("is_primary", true).maybeSingle();
      if (existing.error) throw existing.error;
      const row = { variant_key: JSON.stringify(c), chosen_by: auth.user.id };
      const result = existing.data ? await supabase.from("cde_selected").update(row).eq("group_key", "mobile_dock").eq("is_primary", true).eq("variant_key", existing.data.variant_key).select("variant_key").single() : await supabase.from("cde_selected").insert({ ...row, group_key: "mobile_dock" }).select("variant_key").single();
      if (result.error || result.data?.variant_key !== row.variant_key) throw new Error("Não salvo");
      await qc.invalidateQueries({ queryKey: ["cde-mobile-dock"] }); setDraft(null); toast.success("Faixa de favoritos atualizada");
    } catch { toast.error("Não foi possível salvar a faixa de favoritos"); } finally { setSaving(false); }
  }
  return <div className="space-y-3 border-t border-border pt-4"><h3 className="text-sm font-medium">Favoritos no celular</h3><div className="flex flex-wrap items-end gap-6"><div className="space-y-2"><Label>Fundo da faixa</Label><ColorSelect label="Fundo da faixa de favoritos" value={c.bg} onChange={bg => setDraft({ ...c, bg })} /></div><div className="space-y-2"><Label>Borda da faixa</Label><ColorSelect label="Borda da faixa de favoritos" value={c.border} onChange={border => setDraft({ ...c, border })} /></div><Button variant="ghost" size="icon" aria-label="Salvar faixa de favoritos" title="Salvar faixa de favoritos" disabled={!draft || saving} onClick={save}><Save /></Button></div><div style={mobileDockVars(c)} className="mobile-favorites-band flex max-w-[390px] justify-around p-3" aria-label="Prévia da faixa de favoritos">{["Supply", "Code", "Projects", "OpDesk"].map(name => <AppSymbol key={name} name={name} className="size-8 text-foreground" />)}</div></div>;
}