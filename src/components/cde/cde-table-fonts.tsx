import type React from "react";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Save, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { CdeCategoryHeader } from "./cde-category-header";
import { CdeTableOrder } from "./cde-table-order";
import { ALIGN_H, ALIGN_V, HEADER_COLORS, headerColor, tableAlignVars, type AlignH, type AlignV, type HeaderColorKind } from "./table-fonts-config";
import { useCdeSwatchStyle } from "./cde-button";
import { TABLE_FILTER_SIZES, TABLE_FONTS_DEFAULT, TABLE_HEADER_SIZES, useTableFonts, type TableFontsConfig } from "./table-fonts-config";

export function CdeTableFonts({ number, handle }: { number: number; handle?: import("react").ReactNode }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const saved = useTableFonts().data ?? TABLE_FONTS_DEFAULT;
  const [draft, setDraft] = useState<TableFontsConfig | null>(null);
  const fonts = draft ?? saved;
  const qc = useQueryClient();

  async function save() {
    setSaving(true);
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error("Sessão não encontrada");
      const existing = await supabase.from("cde_selected").select("variant_key").eq("group_key", "table_fonts").eq("is_primary", true).maybeSingle();
      if (existing.error) throw existing.error;
      const row = { variant_key: JSON.stringify(fonts), chosen_by: user.id };
      const result = existing.data
        ? await supabase.from("cde_selected").update(row).eq("group_key", "table_fonts").eq("variant_key", existing.data.variant_key)
        : await supabase.from("cde_selected").insert({ ...row, group_key: "table_fonts" });
      if (result.error) throw result.error;
      await qc.invalidateQueries({ queryKey: ["cde-table-fonts"] });
      setDraft(null);
      toast.success("Fontes de cabeçalhos e filtros atualizadas");
    } catch {
      toast.error("Não foi possível salvar o padrão.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="space-y-4">
      <CdeCategoryHeader handle={handle} number={number} title="Cabeçalhos e Listas" hint="Fontes, alinhamento e ordem das colunas das listas de dados em todos os apps" open={open} onToggle={() => setOpen(!open)} />
      {open && (
        <div className="w-full min-w-0 space-y-4 py-4">
          <div role="group" aria-label="Fontes de cabeçalhos e filtros" className="grid w-full max-w-3xl grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
            <div className="min-w-0 space-y-1">
              <Label>Cabeçalhos de tabela</Label>
              <Select value={String(fonts.headerPx)} onValueChange={(v) => setDraft({ ...fonts, headerPx: Number(v) })}>
                <SelectTrigger className="h-9" aria-label="Fonte dos cabeçalhos de tabela"><SelectValue /></SelectTrigger>
                <SelectContent>{TABLE_HEADER_SIZES.map((n) => <SelectItem key={n} value={String(n)}>{n} px</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="min-w-0 space-y-1">
              <Label>Filtros e buscas</Label>
              <Select value={String(fonts.filterPx)} onValueChange={(v) => setDraft({ ...fonts, filterPx: Number(v) })}>
                <SelectTrigger className="h-9" aria-label="Fonte dos filtros e buscas"><SelectValue /></SelectTrigger>
                <SelectContent>{TABLE_FILTER_SIZES.map((n) => <SelectItem key={n} value={String(n)}>{n} px</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div role="group" aria-label="Alinhamento de cabeçalhos e listas" className="grid w-full max-w-5xl grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
            {([["headerH", "Cabeçalhos — horizontal", ALIGN_H], ["headerV", "Cabeçalhos — vertical", ALIGN_V], ["cellH", "Listas — horizontal", ALIGN_H], ["cellV", "Listas — vertical", ALIGN_V]] as const).map(([k, l, opts]) => (
              <div key={k} className="min-w-0 space-y-1">
                <Label>{l}</Label>
                <Select value={fonts[k]} onValueChange={(v) => setDraft({ ...fonts, [k]: v as AlignH & AlignV })}>
                  <SelectTrigger className="h-9" aria-label={l}><SelectValue /></SelectTrigger>
                  <SelectContent>{opts.map((o) => <SelectItem key={o.key} value={o.key}>{o.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            ))}
          </div>
          <div role="group" aria-label="Cores dos cabeçalhos" className="grid w-full max-w-5xl grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-3">
            {([["headerBg", "Cabeçalhos — fundo"], ["headerText", "Cabeçalhos — texto"], ["headerBorder", "Cabeçalhos — borda"]] as [HeaderColorKind, string][]).map(([k, l]) => <ColorPick key={k} kind={k} label={l} value={fonts[k]} onChange={(v) => setDraft({ ...fonts, [k]: v })} />)}
          </div>
          <div className="space-y-1">
            <Label>Prévia</Label>
            <div aria-label="Prévia das fontes" className="max-w-2xl rounded-md border border-border p-3">
              <div className="mb-2 flex items-center justify-end gap-2" style={{ fontSize: fonts.filterPx }}>
                <span className="text-muted-foreground">Contém</span>
                <span className="text-muted-foreground">Buscar</span>
                <span className="text-muted-foreground">Filtros</span>
              </div>
              <Table style={{ ["--th-fs" as string]: `${fonts.headerPx}px`, ...tableAlignVars(fonts) } as React.CSSProperties}>
                <TableHeader>
                  <TableRow>
                    <TableHead>Approval</TableHead>
                    <TableHead>Itens da Solicitação</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="text-xs">202610230003</TableCell>
                    <TableCell className="text-xs">Reembolso de Despesas<br />Leonardo Roedel</TableCell>
                    <TableCell className="text-xs">Pago</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Aplicado imediatamente a todos os apps após salvar. No celular, os campos de busca mantêm 16 px ao serem tocados para evitar o zoom automático.</p>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" aria-label="Salvar" title="Salvar padrão" onClick={save} disabled={saving || !draft}><Save /></Button>
            {draft && <Button variant="ghost" size="icon" aria-label="Cancelar" title="Cancelar" disabled={saving} onClick={() => setDraft(null)}><X /></Button>}
          </div>
          <div className="border-t border-border pt-4"><CdeTableOrder embedded /></div>
        </div>
      )}
    </section>
  );
}

function ColorPick({ kind, label, value, onChange }: { kind: HeaderColorKind; label: string; value: string; onChange: (v: string) => void }) {
  const swatch = useCdeSwatchStyle();
  const dot = (color: string) => <span aria-hidden="true" style={{ background: color, ...swatch.css }} className={`block h-4 w-4 shrink-0 rounded-full border border-border ${swatch.cls}`} />;
  const current = headerColor(kind, value);
  return <div className="min-w-0 space-y-1"><Label>{label}</Label>
    <Select value={current.key} onValueChange={onChange}><SelectTrigger aria-label={label}><span style={{ display: "inline-flex", alignItems: "center", gap: 10, lineHeight: 1 }} className="min-w-0">{dot(current.value)}<span className="truncate" style={{ lineHeight: "16px" }}>{current.label}</span></span></SelectTrigger>
      <SelectContent>{HEADER_COLORS[kind].map((o) => <SelectItem key={o.key} value={o.key}><span style={{ display: "inline-flex", alignItems: "center", gap: 10, lineHeight: "16px" }}>{dot(o.value)}<span>{o.label}</span></span></SelectItem>)}</SelectContent></Select></div>;
}
