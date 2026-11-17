import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Save, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { CdeCategoryHeader } from "./cde-category-header";
import { CdeNumber } from "./cde-button";
import { ColorSelect } from "./cde-tags";
import { CDE_APPEARANCE_DEFAULT, CDE_APPEARANCE_GROUP, CDE_FONTS, CDE_SIZES, cdeAppearanceVars, useCdeAppearance, type CdeAppearanceConfig, type CdeLevel } from "./cde-appearance";

const COLORS: [keyof CdeLevel, string][] = [["bg", "Fundo"], ["border", "Borda"], ["text", "Texto do título"], ["hint", "Texto da descrição"]];

/** CDE item "Aparência do CDE": colours, sizes and font of the CDE's own category headers and subcategory bands. */
export function CdeAppearance({ number, handle }: { number: number; handle?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const qc = useQueryClient();
  const saved = useCdeAppearance().data ?? CDE_APPEARANCE_DEFAULT;
  const [draft, setDraft] = useState<CdeAppearanceConfig | null>(null);
  const cfg = draft ?? saved;
  const setLv = (lv: "cat" | "sub", k: keyof CdeLevel, v: string | number) => setDraft({ ...cfg, [lv]: { ...cfg[lv], [k]: v } });
  async function save() {
    if (!draft) return; setSaving(true);
    try {
      const user = (await supabase.auth.getUser()).data.user; if (!user) throw new Error();
      const ex = await supabase.from("cde_selected").select("variant_key").eq("group_key", CDE_APPEARANCE_GROUP).eq("is_primary", true).maybeSingle();
      if (ex.error) throw ex.error;
      const row = { variant_key: JSON.stringify(draft), chosen_by: user.id };
      const r = ex.data ? await supabase.from("cde_selected").update(row).eq("group_key", CDE_APPEARANCE_GROUP).eq("variant_key", ex.data.variant_key).select("group_key") : await supabase.from("cde_selected").insert({ ...row, group_key: CDE_APPEARANCE_GROUP }).select("group_key");
      if (r.error || !r.data?.length) throw r.error ?? new Error();
      await qc.invalidateQueries({ queryKey: ["cde-appearance"] }); setDraft(null); toast.success("Aparência do CDE atualizada");
    } catch { toast.error("Não foi possível salvar. Somente Admin do ERP altera o CDE."); } finally { setSaving(false); }
  }
  const block = (lv: "cat" | "sub", title: string) => <div className="space-y-2">
    <p className="text-sm font-medium">{title}</p>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {COLORS.map(([k, l]) => <div key={k} className="space-y-1"><Label className="text-xs">{l}</Label><ColorSelect label={`${l} — ${title}`} value={String(cfg[lv][k])} onChange={(v) => setLv(lv, k, v)} /></div>)}
      {([["titlePx", "Tamanho do título"], ["hintPx", "Tamanho da descrição"]] as const).map(([k, l]) => <div key={k} className="space-y-1"><Label className="text-xs">{l}</Label>
        <Select value={String(cfg[lv][k])} onValueChange={(v) => setLv(lv, k, Number(v))}><SelectTrigger aria-label={`${l} — ${title}`} className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger><SelectContent>{CDE_SIZES.map((s) => <SelectItem key={s} value={String(s)}>{s} px{s === CDE_APPEARANCE_DEFAULT[lv][k] ? " (atual)" : ""}</SelectItem>)}</SelectContent></Select></div>)}
      <div className="space-y-1"><Label className="text-xs">Fonte</Label><Select value={cfg[lv].font} onValueChange={(v) => setLv(lv, "font", v)}><SelectTrigger aria-label={`Fonte — ${title}`} className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger><SelectContent>{CDE_FONTS.map((f) => <SelectItem key={f.key} value={f.key}><span style={f.value ? { fontFamily: f.value } : undefined}>{f.label}</span></SelectItem>)}</SelectContent></Select></div>
    </div>
  </div>;
  return <section className="space-y-4">
    <CdeCategoryHeader handle={handle} number={number} title="Aparência do CDE" hint="Cores, tamanhos e fonte das categorias e subcategorias do próprio CDE" open={open} onToggle={() => setOpen(!open)} />
    {open && <div className="w-full min-w-0 space-y-5 py-4">
      <div className="flex items-center justify-between gap-2"><p className="text-xs text-muted-foreground">As opções “atual” mantêm a aparência de hoje. Ao salvar, vale na hora para todo o CDE.</p>
        {draft && <div className="flex gap-1"><Button variant="ghost" size="icon" aria-label="Salvar" title="Salvar aparência" onClick={save} disabled={saving}><Save /></Button><Button variant="ghost" size="icon" aria-label="Cancelar" title="Cancelar" onClick={() => setDraft(null)}><X /></Button></div>}</div>
      {block("cat", "Categorias")}
      {block("sub", "Subcategorias")}
      <div className="space-y-1"><p className="text-sm font-medium">Prévia</p>
        <div style={cdeAppearanceVars(cfg)} className="rounded-md border border-border p-3">
          <div className="cde-cat-band flex items-center gap-3 border-b px-2 py-3"><CdeNumber>1</CdeNumber><span className="flex flex-wrap items-baseline gap-x-3"><span className="cde-cat-title">Campos para preenchimento</span><span className="cde-cat-hint">Descrição da categoria</span></span></div>
          <div className="py-2 pl-8"><div className="cde-sub-band flex items-center gap-4 px-5 py-2"><CdeNumber subcategory>1.1</CdeNumber><span><span className="cde-sub-title block">Campos de texto e número</span><span className="cde-sub-hint mt-0.5 block">2 modelos · Caixas de uma linha</span></span></div></div>
        </div></div>
    </div>}
  </section>;
}
