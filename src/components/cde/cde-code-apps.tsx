import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { PORTAL_APPS, useAppDisplayName } from "./app-order-config";
import { useCodeAppExclusions } from "./code-apps-config";

/** CDE list of apps served by Code; new portal apps are included automatically. */
export function CdeCodeApps() {
  const qc = useQueryClient();
  const nameOf = useAppDisplayName();
  const { data } = useCodeAppExclusions();
  const [draft, setDraft] = useState<string[] | null>(null);
  const [saving, setSaving] = useState(false);
  const excluded = draft ?? data ?? [];
  function toggle(key: string, on: boolean) { setDraft(on ? excluded.filter((k) => k !== key) : [...excluded, key]); }
  async function save() {
    setSaving(true);
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error("Sessão não encontrada");
      const existing = await supabase.from("cde_selected").select("variant_key").eq("group_key", "code_apps").eq("is_primary", true).maybeSingle();
      if (existing.error) throw existing.error;
      const row = { variant_key: JSON.stringify({ excluded }), chosen_by: user.id };
      const result = existing.data ? await supabase.from("cde_selected").update(row).eq("group_key", "code_apps").eq("variant_key", existing.data.variant_key) : await supabase.from("cde_selected").insert({ ...row, group_key: "code_apps" });
      if (result.error) throw result.error;
      await qc.invalidateQueries({ queryKey: ["cde-code-apps"] });
      setDraft(null); toast.success("Apps atendidos pelo Code atualizados");
    } catch { toast.error("Não foi possível salvar os apps do Code."); } finally { setSaving(false); }
  }
  return <div className="mt-6 space-y-3 border-t border-border pt-4">
    <div className="flex items-center justify-between gap-3"><p className="text-sm font-medium">Apps atendidos pelo Code</p><Button variant="ghost" size="icon" title="Salvar apps do Code" aria-label="Salvar apps do Code" onClick={save} disabled={saving || !draft}><Save /></Button></div>
    <p className="text-xs text-muted-foreground">Novos apps entram automaticamente; desmarque para retirar do Code.</p>
    <div role="group" aria-label="Apps atendidos pelo Code" className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
      {PORTAL_APPS.map((app) => { const id = `code-app-${app.key}`; return <label key={app.key} htmlFor={id} className="flex min-h-9 items-center gap-2 text-sm"><Checkbox id={id} checked={!excluded.includes(app.key)} onCheckedChange={(v) => toggle(app.key, v === true)} />{nameOf(app.key) || app.name}</label>; })}
    </div>
  </div>;
}
