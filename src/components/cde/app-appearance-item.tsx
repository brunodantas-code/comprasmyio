import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Save, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { CdeCategoryHeader } from "./cde-category-header";
import { APP_APPEARANCES, APP_APPEARANCE_GROUP, parseAppAppearance, type AppAppearance } from "./appearance-colors";
import { APP_APPEARANCE_QUERY, useAppAppearance } from "./app-appearance";
import { CdeSection } from "./cde-section";
import { CdeButton } from "./cde-button";
import { CdeAppearance } from "./cde-appearance-item";

export function AppAppearanceItem({ number, handle, children }: { number: number; handle?: React.ReactNode; children?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [contentOpen, setContentOpen] = useState(true);
  const [draft, setDraft] = useState<AppAppearance | null>(null);
  const [saving, setSaving] = useState(false);
  const saved = useAppAppearance();
  const qc = useQueryClient();
  async function save() {
    if (!draft) return;
    setSaving(true);
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error("Sessão não encontrada");
      const previous = await supabase.from("cde_selected").select("variant_key")
        .eq("group_key", APP_APPEARANCE_GROUP).eq("is_primary", true).maybeSingle();
      if (previous.error) throw previous.error;
      const values = { variant_key: draft, chosen_by: user.id };
      const result = previous.data
        ? await supabase.from("cde_selected").update(values).eq("group_key", APP_APPEARANCE_GROUP).eq("is_primary", true).eq("variant_key", previous.data.variant_key).select("variant_key")
        : await supabase.from("cde_selected").insert({ ...values, group_key: APP_APPEARANCE_GROUP, is_primary: true }).select("variant_key");
      if (result.error || result.data?.[0]?.variant_key !== draft) throw result.error ?? new Error("Seleção não confirmada");
      qc.setQueryData(APP_APPEARANCE_QUERY, draft);
      setDraft(null);
      toast.success("Aparência atualizada em todos os apps");
    } catch { toast.error("Não foi possível alterar a aparência. Verifique seu acesso de Admin do ERP."); }
    finally { setSaving(false); }
  }
  return <section className="cde-category-sections">
    <CdeCategoryHeader number={number} handle={handle} title="Aparência" open={open} onToggle={() => setOpen(!open)} />
    {open && <><CdeSection title="Padrão de exibição do ERP" open={contentOpen} actions={<>
          <Button variant="ghost" size="icon" aria-label="Salvar aparência dos apps" title="Salvar aparência dos apps" onClick={save} disabled={saving || !draft || draft === saved.data || saved.isLoading}><Save /></Button>
          <Button variant="ghost" size="icon" aria-label="Cancelar aparência dos apps" title="Cancelar" onClick={() => setDraft(null)} disabled={saving}><X /></Button>
          <CdeButton group="toggle" screen="components/cde/app-appearance-item.tsx" aria-label={`${contentOpen ? "Recolher" : "Exibir"} padrão de exibição do ERP`} title={`${contentOpen ? "Recolher" : "Exibir"} padrão de exibição do ERP`} aria-expanded={contentOpen} onClick={() => setContentOpen(!contentOpen)} />
        </>}>
      <RadioGroup aria-label="Aparência dos apps" value={draft ?? saved.data ?? "green"} onValueChange={value => setDraft(parseAppAppearance(value))} disabled={saving || saved.isLoading} className="grid gap-4 sm:grid-cols-3">
        {APP_APPEARANCES.map(option => <label key={option.key} htmlFor={`app-appearance-${option.key}`} className="flex cursor-pointer flex-nowrap items-center justify-center gap-3 text-sm font-medium leading-none">
          <RadioGroupItem id={`app-appearance-${option.key}`} value={option.key} className="shrink-0" />
          <span data-appearance-reference="" data-palette={option.key} className="appearance-palette flex shrink-0 items-center gap-1" aria-hidden="true"><span className="appearance-sample appearance-sample-soft" /><span className="appearance-sample appearance-sample-mid" /><span className="appearance-sample appearance-sample-strong" /></span>
          <span className="whitespace-nowrap">{option.label}</span>
        </label>)}
      </RadioGroup>
    </CdeSection><CdeAppearance />{children}</>}
  </section>;
}
