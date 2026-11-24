import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Save, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { indicadoresOptions } from "@/components/indicadores/data";
import { indicatorDepartment } from "@/components/indicadores/department";
import { crmOptions } from "@/components/crm/crm-data";
import { importedField } from "@/lib/indicadores-import";
import { CONFIDENCES } from "@/lib/indicadores";
import { CdeCategoryHeader } from "./cde-category-header";
import { useCdeStandards, useCdeSwatchStyle } from "./cde-button";
import { CARD_BORDER_APPS, CARD_BORDER_COLORS, CARD_BORDER_GROUP, CARD_BORDER_MODES, DEFAULT_CARD_BORDER, parseCardBorders, type CardBorderApp, type CardBorderConfig, type CardBorderRule } from "./card-border-config";
import { useAppDisplayName } from "./app-order-config";

export function CdeCardBorders({ number, handle }: { number: number; handle?: React.ReactNode }) {
  const nameOf = useAppDisplayName();
  const [open, setOpen] = useState(false);
  const [app, setApp] = useState<CardBorderApp>("indicadores");
  const [draft, setDraft] = useState<CardBorderConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const standards = useCdeStandards();
  const qc = useQueryClient();
  const swatch = useCdeSwatchStyle();
  const indicators = useQuery({ ...indicadoresOptions, enabled: open && app === "indicadores" });
  const crm = useQuery({ ...crmOptions(), enabled: open && app === "crm" });
  const config = draft ?? parseCardBorders(standards.data?.selected.find(s => s.group_key === CARD_BORDER_GROUP && s.is_primary)?.variant_key);
  const rule = config[app] ?? DEFAULT_CARD_BORDER;
  const change = (next: Partial<CardBorderRule>) => setDraft({ ...config, [app]: { ...rule, ...next } });
  const values = new Map<string, string>();
  if (app === "indicadores" && indicators.data) {
    const data = indicators.data;
    if (rule.mode === "department") data.objectives.forEach(o => { const value = indicatorDepartment(o.id, data.objectives); values.set(value, value); });
    if (rule.mode === "status") [...CONFIDENCES.map(c => c.label), "Check-in pendente", "Atualizado", "Não informada na origem"].forEach(v => values.set(v, v));
    if (rule.mode === "responsible") {
      [...data.objectives, ...data.metrics].forEach(row => {
        const key = row.responsible_id ?? (importedField(row.source_metadata, "responsible_name") || "Sem responsável");
        values.set(key, data.users.find(u => u.id === key)?.full_name ?? (importedField(row.source_metadata, "responsible_name") || "Sem responsável"));
      });
    }
  }
  if (app === "crm" && crm.data) {
    if (rule.mode === "status") [...crm.data.fases, ...crm.data.etapas].forEach(row => values.set(row.nome, row.nome));
    if (rule.mode === "responsible") [...crm.data.leads, ...crm.data.ops].forEach(row => {
      const key = row.dono_id ?? "Sem responsável";
      values.set(key, crm.data?.users.find(u => u.id === key)?.full_name ?? "Sem responsável");
    });
  }
  const colors = rule.mode === "none" ? {} : rule.colors[rule.mode] ?? {};
  Object.keys(colors).forEach(key => { if (!values.has(key)) values.set(key, key); });
  const rows = [...values].sort((a, b) => a[1].localeCompare(b[1], "pt-BR"));
  const loading = app === "indicadores" ? indicators.isLoading : crm.isLoading;
  const error = app === "indicadores" ? indicators.isError : crm.isError;
  async function save() {
    if (!draft) return;
    setSaving(true);
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error("Sessão não encontrada");
      const previous = await supabase.from("cde_selected").select("group_key").eq("group_key", CARD_BORDER_GROUP).eq("is_primary", true).maybeSingle();
      if (previous.error) throw previous.error;
      const payload = { variant_key: JSON.stringify(draft), chosen_by: user.id };
      const request = previous.data
        ? supabase.from("cde_selected").update(payload).eq("group_key", CARD_BORDER_GROUP).eq("is_primary", true)
        : supabase.from("cde_selected").insert({ ...payload, group_key: CARD_BORDER_GROUP, is_primary: true });
      const result = await request.select("variant_key").single();
      if (result.error || result.data?.variant_key !== payload.variant_key) throw result.error ?? new Error("Alteração não confirmada");
      await qc.invalidateQueries({ queryKey: ["cde-standards"] });
      setDraft(null);
      toast.success("Bordas dos cards atualizadas");
    } catch { toast.error("Não foi possível salvar as bordas. Verifique seu acesso de Admin do ERP."); }
    finally { setSaving(false); }
  }
  return <section>
    <CdeCategoryHeader number={number} handle={handle} title="Bordas de classificação dos cards" open={open} onToggle={() => setOpen(!open)} />
    {open && <div className="space-y-4 py-4">
      <div className="flex items-center justify-end gap-1">
        <Button variant="ghost" size="icon" title="Salvar bordas dos cards" aria-label="Salvar bordas dos cards" disabled={saving || !draft || standards.isLoading} onClick={save}><Save /></Button>
        {draft && <Button variant="ghost" size="icon" title="Cancelar alterações das bordas" aria-label="Cancelar alterações das bordas" disabled={saving} onClick={() => setDraft(null)}><X /></Button>}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div><Label>Aplicativo</Label><Select value={app} onValueChange={v => { const choice = CARD_BORDER_APPS.find(a => a.key === v); if (choice) setApp(choice.key); }} disabled={saving}><SelectTrigger aria-label="Aplicativo das bordas"><SelectValue /></SelectTrigger><SelectContent>{CARD_BORDER_APPS.map(a => <SelectItem key={a.key} value={a.key}>{nameOf(a.key) || a.label}</SelectItem>)}</SelectContent></Select></div>
        <div><Label>Classificação</Label><Select value={rule.mode} onValueChange={v => { const choice = CARD_BORDER_MODES.find(m => m.key === v); if (choice) change({ mode: choice.key }); }} disabled={saving}><SelectTrigger aria-label="Classificação das bordas"><SelectValue /></SelectTrigger><SelectContent>{CARD_BORDER_MODES.map(m => <SelectItem key={m.key} value={m.key} disabled={app === "crm" && m.key === "department"}>{m.label}</SelectItem>)}</SelectContent></Select></div>
        <div><Label>Posição da borda</Label><Select value={rule.edge} onValueChange={v => change({ edge: v === "all" ? "all" : "top" })} disabled={saving || rule.mode === "none"}><SelectTrigger aria-label="Posição da borda"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="top">Superior</SelectItem><SelectItem value="all">Contorno completo</SelectItem></SelectContent></Select></div>
        <div><Label>Espessura</Label><Select value={String(rule.width)} onValueChange={v => change({ width: Number(v) })} disabled={saving || rule.mode === "none"}><SelectTrigger aria-label="Espessura da borda"><SelectValue /></SelectTrigger><SelectContent>{[1, 2, 3, 4].map(n => <SelectItem key={n} value={String(n)}>{n} px</SelectItem>)}</SelectContent></Select></div>
      </div>
      {rule.mode !== "none" && <>
        {loading ? <p className="text-sm text-muted-foreground">Carregando classificações...</p> : error ? <p className="text-sm text-destructive">Não foi possível carregar as classificações disponíveis para seu acesso.</p> : !rows.length ? <p className="text-sm text-muted-foreground">Nenhuma classificação cadastrada.</p> : null}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{rows.map(([key, label]) => <div key={key} className="min-w-0"><Label title={label} className="block truncate">{label}</Label><Select value={colors[key] ?? "padrao"} disabled={saving} onValueChange={v => {
          if (rule.mode === "none") return;
          const next = { ...colors };
          const color = CARD_BORDER_COLORS.find(c => c.key === v);
          if (color) next[key] = color.key; else delete next[key];
          change({ colors: { ...rule.colors, [rule.mode]: next } });
        }}><SelectTrigger aria-label={`Cor da borda: ${label}`}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="padrao">Padrão atual</SelectItem>{CARD_BORDER_COLORS.map(color => <SelectItem key={color.key} value={color.key}><span className="flex items-center gap-2"><span aria-hidden="true" data-appearance-reference="" data-card-border-color={color.key} className="card-border-swatch size-4 shrink-0" style={swatch.css} />{color.label}</span></SelectItem>)}</SelectContent></Select></div>)}</div>
        <div className="space-y-2"><Label>Prévia</Label><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{rows.slice(0, 6).map(([key, label]) => <Card key={key} classification={{ app, [rule.mode]: key }} classificationPreview={config} className="h-24 min-w-0"><CardContent className="flex h-full min-w-0 items-center p-4 sm:p-4"><span className="truncate text-sm" title={label}>{label}</span></CardContent></Card>)}</div></div>
      </>}
    </div>}
  </section>;
}