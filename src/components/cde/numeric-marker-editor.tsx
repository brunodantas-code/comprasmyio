import { FontFormatControl } from "./font-format-control";
import { CdeSection } from "./cde-section";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Save, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useCdeStandards } from "./cde-button";
import { MARKER_COLORS, MARKER_DEFAULTS, NumericMarker, useMarkerLook } from "./numeric-markers";

export function NumericMarkerEditor({ kind }: { kind: "record_number" | "alert_marker"; number: string }) {
  const saved = useMarkerLook(kind);
  const { data } = useCdeStandards();
  const qc = useQueryClient();
  const [draft, setDraft] = useState(saved);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const look = dirty ? draft : saved;
  const title = kind === "record_number" ? "Números de chamados e tickets" : "Bolinhas de notificações e pendências";
  async function save() {
    setBusy(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Sessão não encontrada");
      const value = { variant_key: JSON.stringify(look), chosen_by: auth.user.id };
      const row = data?.selected.find(s => s.group_key === kind && s.is_primary);
      const result = row ? await supabase.from("cde_selected").update(value).eq("group_key", kind).eq("is_primary", true).select("group_key").single() : await supabase.from("cde_selected").insert({ ...value, group_key: kind, is_primary: true }).select("group_key").single();
      if (result.error) throw result.error;
      await qc.invalidateQueries({ queryKey: ["cde-standards"] });
      setDirty(false); toast.success("Aparência atualizada nos apps");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Não foi possível salvar"); } finally { setBusy(false); }
  }
  return <CdeSection title={title} actions={<><Button variant="ghost" size="icon" aria-label={`Salvar ${title}`} title="Salvar aparência" disabled={busy || !dirty || JSON.stringify(draft) === JSON.stringify(saved)} onClick={() => void save()}><Save /></Button></>}>
    
    <div className="grid gap-3 sm:grid-cols-3">
      {(["bg", "text", "border"] as const).map((key, i) => <div key={key} className="space-y-1"><Label>{["Fundo", "Texto", "Borda"][i]}</Label><Select value={look[key]} onValueChange={v => { setDraft({ ...look, [key]: v }); setDirty(true); }}><SelectTrigger aria-label={`${title} — ${["Fundo", "Texto", "Borda"][i]}`}><SelectValue /></SelectTrigger><SelectContent>{MARKER_COLORS.map(c => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}</SelectContent></Select></div>)}
      <div className="space-y-1"><Label>Formato</Label><Select value={look.shape} onValueChange={v => { setDraft({ ...look, shape: v }); setDirty(true); }}><SelectTrigger aria-label={`${title} — Formato`}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="circle">Circular</SelectItem><SelectItem value="square">Quadrado</SelectItem><SelectItem value="rounded">Arredondado</SelectItem></SelectContent></Select></div>
      <div className="space-y-1"><Label htmlFor={`${kind}-size`}>Tamanho (px)</Label><Input id={`${kind}-size`} type="number" min={16} max={48} value={look.size} onChange={e => { setDraft({ ...look, size: Math.min(48, Math.max(16, Number(e.target.value))) }); setDirty(true); }} /></div>
      <div className="space-y-1"><Label htmlFor={`${kind}-font`}>Texto (px)</Label><Input id={`${kind}-font`} type="number" min={9} max={20} value={look.font} onChange={e => { setDraft({ ...look, font: Math.min(20, Math.max(9, Number(e.target.value))) }); setDirty(true); }} /></div>
      <FontFormatControl context={title} value={look.format ?? {}} onChange={format => { setDraft({ ...look, format }); setDirty(true); }} />
    </div>
    <div className="flex items-center gap-3"><span className="text-xs text-muted-foreground">Prévia</span>{["7", "59", "99+"].map(v => <NumericMarker key={v} kind={kind} look={look}>{v}</NumericMarker>)}<Button variant="ghost" size="compactIcon" aria-label={`Restaurar padrão de ${title}`} title="Restaurar padrão" onClick={() => { setDraft(MARKER_DEFAULTS[kind]); setDirty(true); }}><RotateCcw /></Button></div>
  </CdeSection>;
}