import { useId, useState } from "react";
import { Pencil } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CdeDraftSave } from "./cde-draft-save";
import { MENU_NAMES_GROUP, MENU_NAMES_QUERY, menuNameKey, parseMenuNames } from "./menu-names";
import { useMenuDisplayName } from "./use-menu-names";

export function CdeMenuNameEdit({ app, group, identity, label = identity }: { app: string; group: string; identity: string; label?: string }) {
  const displayName = useMenuDisplayName(app, group)(identity, label);
  const id = useId();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const { data: admin } = useQuery({ queryKey: ["cde-menu-name-admin"], queryFn: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    const { data, error } = await supabase.from("erp_admins").select("user_id").eq("user_id", user.id).maybeSingle();
    if (error) throw error;
    return !!data;
  } });

  async function save() {
    if (!admin || saving || !draft.trim()) return;
    setSaving(true);
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw authError ?? new Error("Sessão expirada");
      const existing = await supabase.from("cde_selected").select("variant_key").eq("group_key", MENU_NAMES_GROUP).eq("is_primary", true).maybeSingle();
      if (existing.error) throw existing.error;
      const all = parseMenuNames(existing.data?.variant_key);
      const key = menuNameKey(app, group);
      const next = { ...all, [key]: { ...all[key], [identity]: draft.trim() } };
      const row = { variant_key: JSON.stringify(next), chosen_by: user.id };
      const result = existing.data
        ? await supabase.from("cde_selected").update(row).eq("group_key", MENU_NAMES_GROUP).eq("is_primary", true).eq("variant_key", existing.data.variant_key).select("variant_key").single()
        : await supabase.from("cde_selected").insert({ ...row, group_key: MENU_NAMES_GROUP, is_primary: true }).select("variant_key").single();
      if (result.error) throw result.error;
      if (result.data?.variant_key !== row.variant_key) throw new Error("Salvamento não confirmado");
      qc.setQueryData(MENU_NAMES_QUERY, next);
      await qc.invalidateQueries({ queryKey: MENU_NAMES_QUERY });
      setOpen(false);
      toast.success("Nome do menu salvo");
    } catch { toast.error("Não foi possível salvar o nome do menu. Tente novamente."); }
    finally { setSaving(false); }
  }

  return <>
    <span className="flex w-full max-w-full flex-col items-center justify-start gap-1">
      <span className="min-w-0 break-words text-[0.7rem] leading-tight">{displayName}</span>
      {admin ? <Button variant="ghost" size="compactIcon" className="shrink-0" aria-label={`Editar nome do menu ${label} de ${app}`} title={`Editar ${displayName}`} onClick={() => { setDraft(displayName); setOpen(true); }}><Pencil /></Button> : null}
    </span>
    <Dialog open={open} onOpenChange={value => { if (!saving) setOpen(value); }}>
      <DialogContent topActions={open ? <CdeDraftSave value={draft.trim()} disabled={saving || !draft.trim()} onSave={save} label="Salvar nome do menu" /> : undefined}>
        <DialogHeader><DialogTitle>Editar nome do menu</DialogTitle></DialogHeader>
        <div className="space-y-2"><Label htmlFor={id}>Nome</Label><Input id={id} value={draft} onChange={event => setDraft(event.target.value)} /></div>
      </DialogContent>
    </Dialog>
  </>;
}