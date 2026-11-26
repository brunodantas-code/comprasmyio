import { CdeSection } from "./cde-section";
import { CdeButton } from "./cde-button";
import { APP_SHORTCUTS } from "@/lib/app-shortcuts";
import { appDisplay, type AppTileConfig } from "./app-order-config";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { ERP_SELECTABLE_ICONS, erpIconKey, appIconChoices, type ErpIconKey, type AppIconChoices } from "@/lib/erp-icon";
import { supabase } from "@/integrations/supabase/client";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { BRAND_ASSETS } from "@/lib/brand-assets";

/** Catalog of the actual assets used by route head and phone manifests. */
export function CdeAppShortcuts({ tile }: { tile: AppTileConfig }) {
  const qc = useQueryClient();
  const router = useRouter();
  const [draft, setDraft] = useState<ErpIconKey | null>(null);
  const [saving, setSaving] = useState(false);
  const [iconsOpen, setIconsOpen] = useState(true);
  const [filesOpen, setFilesOpen] = useState(true);
  const [appDraft, setAppDraft] = useState<AppIconChoices | null>(null);
  const { data } = useQuery({ queryKey: ["cde-erp-icon"], queryFn: async () => {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) throw new Error("Sessão não encontrada");
    const [choice, admin, apps] = await Promise.all([
      supabase.rpc("public_erp_icon"),
      supabase.rpc("is_erp_admin", { _user_id: user.id }),
      supabase.rpc("public_app_shortcut_icons"),
    ]);
    if (choice.error) throw choice.error;
    if (admin.error) throw admin.error;
    if (apps.error) throw apps.error;
    return { key: erpIconKey(choice.data), admin: Boolean(admin.data), apps: appIconChoices(apps.data) };
  } });
  const selected = draft ?? data?.key ?? "myio";
  async function saveApps() {
    if (!data?.admin || !appDraft) return;
    setSaving(true);
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error("Sessão não encontrada");
      const existing = await supabase.from("cde_selected").select("variant_key").eq("group_key", "app_shortcut_icons").eq("is_primary", true).maybeSingle();
      if (existing.error) throw existing.error;
      const row = { variant_key: JSON.stringify(appDraft), chosen_by: user.id };
      const result = existing.data
        ? await supabase.from("cde_selected").update(row).eq("group_key", "app_shortcut_icons").eq("is_primary", true).eq("variant_key", existing.data.variant_key).select("variant_key").single()
        : await supabase.from("cde_selected").insert({ ...row, group_key: "app_shortcut_icons", is_primary: true }).select("variant_key").single();
      if (result.error) throw result.error;
      if (result.data?.variant_key !== row.variant_key) throw new Error("O padrão não foi salvo");
      await qc.invalidateQueries({ queryKey: ["cde-erp-icon"] });
      await router.invalidate();
      setAppDraft(null);
      toast.success("Ícones dos apps atualizados");
    } catch { toast.error("Não foi possível salvar os ícones"); }
    finally { setSaving(false); }
  }
  async function save() {
    if (!data?.admin || !draft) return;
    setSaving(true);
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error("Sessão não encontrada");
      const existing = await supabase.from("cde_selected").select("variant_key").eq("group_key", "erp_icon").eq("is_primary", true).maybeSingle();
      if (existing.error) throw existing.error;
      const row = { variant_key: draft, chosen_by: user.id };
      const result = existing.data
        ? await supabase.from("cde_selected").update(row).eq("group_key", "erp_icon").eq("is_primary", true).eq("variant_key", existing.data.variant_key).select("variant_key").single()
        : await supabase.from("cde_selected").insert({ ...row, group_key: "erp_icon", is_primary: true }).select("variant_key").single();
      if (result.error) throw result.error;
      if (result.data?.variant_key !== draft) throw new Error("O padrão não foi salvo");
      await qc.invalidateQueries({ queryKey: ["cde-erp-icon"] });
      await router.invalidate();
      setDraft(null);
      toast.success("Ícone padrão do ERP atualizado");
    } catch { toast.error("Não foi possível salvar o ícone"); }
    finally { setSaving(false); }
  }
  return <div className="space-y-4">
    
    <CdeSection title="Favicons e ícones de atalhos" open={iconsOpen} actions={<><Button variant="ghost" size="compactIcon" aria-label="Salvar ícone padrão do ERP" title="Salvar ícone padrão do ERP" onClick={save} disabled={saving || !draft || draft === data?.key}><Save /></Button><Button variant="ghost" size="compactIcon" aria-label="Salvar ícones dos apps" title="Salvar ícones dos apps" onClick={saveApps} disabled={saving || !appDraft || JSON.stringify(appDraft) === JSON.stringify(data?.apps ?? {})}><Save /></Button><CdeButton group="toggle" screen="components/cde/cde-app-shortcuts.tsx" aria-label={`${iconsOpen ? "Recolher" : "Exibir"} favicons e ícones de atalhos`} title={`${iconsOpen ? "Recolher" : "Exibir"} favicons e ícones de atalhos`} aria-expanded={iconsOpen} onClick={() => setIconsOpen(!iconsOpen)} /></>}>
      <div role="group" aria-label="Favicons e ícones de atalhos" className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      <figure className="flex min-w-0 flex-col items-center gap-2 text-center">
        <RadioGroup aria-label="Ícone padrão do ERP" value={selected} onValueChange={value => setDraft(erpIconKey(value))} disabled={!data?.admin || saving} className="grid grid-cols-2 gap-3">
          {ERP_SELECTABLE_ICONS.map(option => <Label key={option.key} htmlFor={`erp-icon-${option.key}`} title={option.label} className="grid justify-items-center gap-4">
            <span className="grid justify-items-center gap-4">
              <img src={`${option.base}/apple-touch-icon.png`} width={64} height={64} alt={option.label} className="size-16 shrink-0 rounded-lg" />
              <RadioGroupItem id={`erp-icon-${option.key}`} value={option.key} />
            </span>
          </Label>)}
        </RadioGroup>
        <figcaption className="text-sm">myio ERP<span className="block text-xs text-muted-foreground">Home Page</span></figcaption>
      </figure>
      {APP_SHORTCUTS.map(app => <figure key={app.key} className="flex min-w-0 flex-col items-center gap-2 text-center">
        <RadioGroup aria-label={`Ícone de atalho do ${app.name}`} value={(appDraft ?? data?.apps)?.[app.key] ?? "white"} onValueChange={value => setAppDraft({ ...(appDraft ?? data?.apps ?? {}), [app.key]: value === "green" ? "green" : "white" })} disabled={!data?.admin || saving} className="grid grid-cols-2 gap-3">
          {(["white", "green"] as const).map(model => <Label key={model} htmlFor={`shortcut-${app.key}-${model}`} className="grid justify-items-center gap-4">
            <span className="grid justify-items-center gap-4">
            <img src={`/app-icons/${app.key}${model === "green" ? "/green" : ""}/apple-touch-icon.png`} width={64} height={64} alt={`${app.name}: ${model === "green" ? "símbolo preto no verde" : "símbolo verde no branco"}`} className="size-16 rounded-lg" />
            <RadioGroupItem id={`shortcut-${app.key}-${model}`} value={model} />
            </span>
          </Label>)}
        </RadioGroup>
        <figcaption className="max-w-full break-words text-sm">{appDisplay(tile, app.key).name}<span className="block text-xs text-muted-foreground">{app.path}</span></figcaption>
      </figure>)}
      </div>
    </CdeSection>
    
    <CdeSection title="Arquivos oficiais da marca" open={filesOpen} actions={<CdeButton group="toggle" screen="components/cde/cde-app-shortcuts.tsx" aria-label={`${filesOpen ? "Recolher" : "Exibir"} arquivos oficiais da marca`} title={`${filesOpen ? "Recolher" : "Exibir"} arquivos oficiais da marca`} aria-expanded={filesOpen} onClick={() => setFilesOpen(!filesOpen)} />}>
      
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {BRAND_ASSETS.map(asset => <figure key={asset.key} className="flex min-w-0 items-center gap-3">
          <img src={asset.preview} width={64} height={64} alt={asset.label} className="size-16 shrink-0 object-contain" />
          <figcaption className="min-w-0 text-sm">
            <span className="block">{asset.label}</span>
            <a href={asset.url} target="_blank" rel="noopener noreferrer" className="text-foreground underline hover:text-primary" aria-label={`Abrir original ${asset.filename}`}>Arquivo original</a>
          </figcaption>
        </figure>)}
      </div>
    </CdeSection>
  </div>;
}