import { Check, Save, X } from "lucide-react";
import { CdeSection } from "./cde-section";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useCdeSwatchStyle } from "./cde-button";
import { CdeButton } from "./cde-button";
import { cn } from "@/lib/utils";
import { TOP_ICON_DEFAULT, TOP_ICON_GROUP, topIconVars, useTopIconStyle, type TopIconStyle } from "./top-icon-style";
import { COLOR_PALETTE } from "./color-palette";

type Item = { label: string; icon: React.ComponentType<{ className?: string }>; name: string };
const COLORS = [
  ...COLOR_PALETTE,
  { value: "var(--foreground)", label: "Texto" },
  { value: "var(--border)", label: "Cinza da borda" },
  { value: "var(--color-dropdown-highlight, var(--accent))", label: "Verde de interação" },
];
const LEGACY_COLORS = [
  { value: "var(--whatsapp-green)", label: "Verde" },
  { value: "var(--whatsapp-border)", label: "Verde médio" },
  { value: "var(--mytosis-green-soft)", label: "Verde claro" },
  { value: "var(--mytosis-purple-mid)", label: "Lilás" },
  { value: "var(--mytosis-purple-soft)", label: "Lilás claro" },
  { value: "var(--card)", label: "Branco" },
];

export function CdeColorSwatches({ label, value, onChange, inherited = "var(--foreground)" }: { label: string; value: string; onChange: (v: string) => void; inherited?: string }) {
  const swatch = useCdeSwatchStyle();
  const selected = value || inherited;
  const current = COLORS.find(c => c.value === selected) ?? LEGACY_COLORS.find(c => c.value === selected) ?? { value: selected, label: "Cor personalizada" };
  const choices = COLORS.some(c => c.value === selected) ? COLORS : [current, ...COLORS.filter(c => c.label !== current.label)];
  return <div className="space-y-1"><div className="text-xs text-muted-foreground">{label}</div>
    <div className="flex flex-wrap items-center gap-1.5">{choices.map(({ value: c, label: name }) => <button key={c || "empty"} type="button" title={name} aria-label={`${label}: ${name}`} aria-pressed={selected === c} onClick={() => onChange(c)}
      className={cn("relative h-6 w-6 border", selected === c ? "ring-2 ring-primary ring-offset-1" : "border-border", swatch.cls)} style={{ ...swatch.css, background: c }}>{selected === c ? <Check className="absolute -right-1 -top-1 size-3 rounded-full bg-background text-foreground" /> : null}</button>)}
      <span className="text-[0.6rem] text-muted-foreground/60">{current.label}</span></div></div>;
}

export function TopIconStyleEditor({ items }: { items: Item[] }) {
  const qc = useQueryClient();
  const { data } = useTopIconStyle();
  const [draft, setDraft] = useState<TopIconStyle | null>(null);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(true);
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
      setDraft(null); toast.success("Regra dos ícones aplicada a todos os apps");
    } catch { toast.error("Não foi possível salvar (somente Admin)."); } finally { setSaving(false); }
  }
  return <CdeSection title="Ícones dos menus" open={open} actions={<><Button aria-label="Salvar Ícones dos menus" title="Salvar Ícones dos menus" size="icon" variant="ghost" disabled={saving || !draft} onClick={save}><Save /></Button><Button aria-label="Cancelar alterações" title="Cancelar alterações" size="icon" variant="ghost" onClick={() => setDraft(null)}><X /></Button><CdeButton group="toggle" screen="components/cde/top-icon-style-editor.tsx" aria-label={`${open ? "Recolher" : "Exibir"} ícones dos menus`} title={`${open ? "Recolher" : "Exibir"} ícones dos menus`} aria-expanded={open} onClick={() => setOpen(!open)} /></>}>
    <div className="flex flex-wrap gap-4" style={topIconVars(s) as React.CSSProperties}>{items.map((it) => { const Icon = it.icon; return <div key={it.label} className="flex w-24 flex-col items-center gap-1 text-center">
      <span className="top-icon flex h-10 w-10 items-center justify-center"><Icon className="h-5 w-5" /></span>
      <span className="text-[0.7rem] leading-tight">{it.label}</span><span className="text-[0.6rem] text-muted-foreground/70">{it.name}</span></div>; })}</div>
    <div className="grid gap-3 sm:grid-cols-3">
      <CdeColorSwatches label="Cor do símbolo" value={s.fg} inherited="var(--foreground)" onChange={(fg) => set({ fg })} />
      <CdeColorSwatches label="Cor de fundo" value={s.bg} inherited="transparent" onChange={(bg) => set({ bg })} />
      <CdeColorSwatches label="Cor da borda" value={s.border} inherited="var(--border)" onChange={(border) => set({ border })} />
    </div>
    <div className="flex flex-wrap items-center gap-4 text-xs">
      <label className="flex items-center gap-2">Espessura da borda
        <select className="h-7 rounded border border-border bg-background px-1" value={s.borderWidth} onChange={(e) => set({ borderWidth: Number(e.target.value) })}>{[0, 1, 2, 3].map((n) => <option key={n} value={n}>{n === 0 ? "Sem borda" : `${n} px`}</option>)}</select></label>
      <label className="flex items-center gap-2">Arredondamento
        <select className="h-7 rounded border border-border bg-background px-1" value={s.radius} onChange={(e) => set({ radius: Number(e.target.value) })}>{[0, 4, 6, 8, 12, 999].map((n) => <option key={n} value={n}>{n === 999 ? "Redondo" : `${n} px`}</option>)}</select></label>
      {draft ? <></> : null}
    </div>
  </CdeSection>;
}
