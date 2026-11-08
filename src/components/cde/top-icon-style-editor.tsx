import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { TOP_ICON_DEFAULT, TOP_ICON_GROUP, topIconVars, useTopIconStyle, type TopIconStyle } from "./top-icon-style";

type Item = { label: string; icon: React.ComponentType<{ className?: string }>; name: string };
const COLORS = ["", "#000000", "#21A961", "#42D898", "#E8F7EF", "#FFFFFF", "#6B7280", "#D1D5DB"];

function Swatches({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return <div className="space-y-1"><div className="text-xs text-muted-foreground">{label}</div>
    <div className="flex flex-wrap items-center gap-1.5">{COLORS.map((c) => <button key={c || "auto"} type="button" title={c || "Padrão"} onClick={() => onChange(c)}
      className={`h-6 w-6 rounded border ${value === c ? "ring-2 ring-primary ring-offset-1" : "border-border"}`} style={c ? { background: c } : undefined}>{c ? null : <span className="text-[9px]">auto</span>}</button>)}
      <input type="color" aria-label={`${label} personalizada`} value={value || "#000000"} onChange={(e) => onChange(e.target.value)} className="h-6 w-8 cursor-pointer rounded border border-border bg-transparent" />
      <span className="text-[0.6rem] text-muted-foreground/60">{value || "padrão"}</span></div></div>;
}

export function TopIconStyleEditor({ items }: { items: Item[] }) {
  const qc = useQueryClient();
  const { data } = useTopIconStyle();
  const [draft, setDraft] = useState<TopIconStyle | null>(null);
  const [saving, setSaving] = useState(false);
  const s = draft ?? data ?? TOP_ICON_DEFAULT;
  const set = (p: Partial<TopIconStyle>) => setDraft({ ...s, ...p });
  async function save() {
    setSaving(true);
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error();
      const existing = await supabase.from("cde_selected").select("variant_key").eq("group_key", TOP_ICON_GROUP).eq("is_primary", true).maybeSingle();
      const row = { variant_key: JSON.stringify(s), chosen_by: user.id };
      const r = existing.data ? await supabase.from("cde_selected").update(row).eq("group_key", TOP_ICON_GROUP).eq("variant_key", existing.data.variant_key) : await supabase.from("cde_selected").insert({ ...row, group_key: TOP_ICON_GROUP });
      if (r.error) throw r.error;
      await qc.invalidateQueries({ queryKey: ["cde-top-icon-style"] });
      setDraft(null); toast.success("Ícones da barra superior atualizados");
    } catch { toast.error("Não foi possível salvar (somente Admin)."); } finally { setSaving(false); }
  }
  return <div className="space-y-3">
    <div className="flex flex-wrap gap-4" style={topIconVars(s) as React.CSSProperties}>{items.map((it) => { const Icon = it.icon; return <div key={it.label} className="flex w-24 flex-col items-center gap-1 text-center">
      <span className="top-icon flex h-10 w-10 items-center justify-center"><Icon className="h-5 w-5" /></span>
      <span className="text-[0.7rem] leading-tight">{it.label}</span><span className="text-[0.6rem] text-muted-foreground/70">{it.name}</span></div>; })}</div>
    <div className="grid gap-3 sm:grid-cols-3">
      <Swatches label="Cor do símbolo" value={s.fg} onChange={(fg) => set({ fg })} />
      <Swatches label="Cor de fundo" value={s.bg} onChange={(bg) => set({ bg })} />
      <Swatches label="Cor da borda" value={s.border} onChange={(border) => set({ border })} />
    </div>
    <div className="flex flex-wrap items-center gap-4 text-xs">
      <label className="flex items-center gap-2">Espessura da borda
        <select className="h-7 rounded border border-border bg-background px-1" value={s.borderWidth} onChange={(e) => set({ borderWidth: Number(e.target.value) })}>{[0, 1, 2, 3].map((n) => <option key={n} value={n}>{n === 0 ? "Sem borda" : `${n} px`}</option>)}</select></label>
      <label className="flex items-center gap-2">Arredondamento
        <select className="h-7 rounded border border-border bg-background px-1" value={s.radius} onChange={(e) => set({ radius: Number(e.target.value) })}>{[0, 4, 6, 8, 12, 999].map((n) => <option key={n} value={n}>{n === 999 ? "Redondo" : `${n} px`}</option>)}</select></label>
      {draft ? <><Button size="sm" variant="action" disabled={saving} onClick={save}>Salvar</Button><Button size="sm" variant="outline" onClick={() => setDraft(null)}>Cancelar</Button></> : null}
    </div>
  </div>;
}
