import { FontFormatControl } from "./font-format-control";
import { fontFormatCss } from "./font-format";
import { CdeSection } from "./cde-section";
import type React from "react";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Save, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CardDescription, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { CdeCategoryHeader } from "./cde-category-header";
import { CdeTableOrder } from "./cde-table-order";
import { ALIGN_H, ALIGN_V, HEADER_COLORS, headerColor, tableAlignVars, type AlignH, type AlignV, type HeaderColorKind } from "./table-fonts-config";
import { CdeButton, useCdeSwatchStyle } from "./cde-button";
import { TABLE_FILTER_SIZES, TABLE_FONTS_DEFAULT, TABLE_HEADER_SIZES, useTableFonts, type TableFontsConfig } from "./table-fonts-config";

export function CdeTableFonts({ number, handle }: { number: number; handle?: import("react").ReactNode }) {
  const [open, setOpen] = useState(false);
  const [contentOpen, setContentOpen] = useState(true);
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
        ? await supabase.from("cde_selected").update(row).eq("group_key", "table_fonts").eq("is_primary", true).eq("variant_key", existing.data.variant_key).select("variant_key").single()
        : await supabase.from("cde_selected").insert({ ...row, group_key: "table_fonts" }).select("variant_key").single();
      if (result.error) throw result.error;
      if (result.data?.variant_key !== row.variant_key) throw new Error("Padrão não foi salvo");
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
    <section className="cde-category-sections">
      <CdeCategoryHeader handle={handle} number={number} title="Cabeçalhos e Listas" hint="Fontes, cores, títulos dos campos, títulos e subtítulos, alinhamento e ordem das colunas" open={open} onToggle={() => setOpen(!open)} />
      {open && (
        <div className="space-y-4"><CdeSection title="Fontes, cores e alinhamento" open={contentOpen} actions={<><Button variant="ghost" size="icon" aria-label="Salvar" title="Salvar padrão" onClick={save} disabled={saving || !draft || JSON.stringify(draft) === JSON.stringify(saved)}><Save /></Button><Button variant="ghost" size="icon" aria-label="Cancelar" title="Cancelar" disabled={saving} onClick={() => setDraft(null)}><X /></Button><CdeButton group="toggle" screen="components/cde/cde-table-fonts.tsx" aria-label={`${contentOpen ? "Recolher" : "Exibir"} fontes, cores e alinhamento`} title={`${contentOpen ? "Recolher" : "Exibir"} fontes, cores e alinhamento`} aria-expanded={contentOpen} onClick={() => setContentOpen(!contentOpen)} /></>}>
          <div role="group" aria-label="Fontes de cabeçalhos e filtros" className="grid w-full max-w-3xl grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
            <div className="min-w-0 space-y-1">
              <Label>Cabeçalhos de tabela</Label>
              <Select value={String(fonts.headerPx)} onValueChange={(v) => setDraft({ ...fonts, headerPx: Number(v) })}>
                <SelectTrigger className="h-9" aria-label="Fonte dos cabeçalhos de tabela"><SelectValue /></SelectTrigger>
                <SelectContent>{TABLE_HEADER_SIZES.map((n) => <SelectItem key={n} value={String(n)}>{n} px</SelectItem>)}</SelectContent>
              </Select>
              <FontFormatControl context="Cabeçalhos de tabela" value={fonts.headerFormat ?? {}} onChange={format => setDraft({ ...fonts, headerFormat: format })} />
            </div>
            <div className="min-w-0 space-y-1">
              <Label>Filtros e buscas</Label>
              <Select value={String(fonts.filterPx)} onValueChange={(v) => setDraft({ ...fonts, filterPx: Number(v) })}>
                <SelectTrigger className="h-9" aria-label="Fonte dos filtros e buscas"><SelectValue /></SelectTrigger>
                <SelectContent>{TABLE_FILTER_SIZES.map((n) => <SelectItem key={n} value={String(n)}>{n} px</SelectItem>)}</SelectContent>
              </Select>
              <FontFormatControl context="Filtros e buscas" value={fonts.filterFormat ?? {}} onChange={format => setDraft({ ...fonts, filterFormat: format })} />
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
          <div role="group" aria-label="Cores dos cabeçalhos e listas" className="grid w-full max-w-5xl grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-3">
            {([["headerBg", "Cabeçalhos — fundo"], ["headerText", "Cabeçalhos — texto"], ["headerBorder", "Cabeçalhos — borda"], ["cellBg", "Listas — fundo"], ["cellText", "Listas — texto"], ["cellBorder", "Listas — borda"], ["titleBg", "Títulos — fundo"], ["titleText", "Títulos — texto"], ["titleBorder", "Títulos — borda"], ["subBg", "Subtítulos — fundo"], ["subText", "Subtítulos — texto"], ["subBorder", "Subtítulos — borda"]] as [HeaderColorKind, string][]).map(([k, l]) => {
              const format = k === "cellText" ? { key: "cellFormat", context: "Listas" } as const : k === "titleText" ? { key: "titleFormat", context: "Títulos" } as const : k === "subText" ? { key: "subFormat", context: "Subtítulos" } as const : null;
              return <div key={k} className="min-w-0 space-y-2"><ColorPick kind={k} label={l} value={fonts[k]} onChange={(v) => setDraft({ ...fonts, [k]: v })} />{format && <FontFormatControl context={format.context} value={fonts[format.key] ?? {}} onChange={value => setDraft({ ...fonts, [format.key]: value })} />}</div>;
            })}
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-medium">Títulos dos campos</h3>
            <div role="group" aria-label="Formatação dos títulos dos campos" className="grid w-full max-w-5xl grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-3">
              {([["fieldBg", "Títulos dos campos — fundo"], ["fieldText", "Títulos dos campos — texto"], ["fieldBorder", "Títulos dos campos — borda"]] as const).map(([k, l]) => <div key={k} className="min-w-0 space-y-2"><ColorPick kind={k} label={l} value={fonts[k]} onChange={(v) => setDraft({ ...fonts, [k]: v })} />{k === "fieldText" && <FontFormatControl context="Títulos dos campos" value={fonts.fieldFormat ?? {}} onChange={format => setDraft({ ...fonts, fieldFormat: format })} />}</div>)}
            </div>
            <div aria-label="Prévia dos títulos dos campos" style={tableAlignVars(fonts) as React.CSSProperties} className="flex flex-wrap gap-4 py-3"><Label>Nome</Label><Label>Responsável</Label><Label>Borda</Label></div>
          </div>
          <div className="space-y-1">
            <Label>Prévia</Label>
            <div aria-label="Prévia das fontes" className="max-w-2xl rounded-md border border-border p-3" style={tableAlignVars(fonts) as React.CSSProperties}>
              <div className="mb-3 space-y-1"><CardTitle>Minhas Solicitações</CardTitle><CardDescription>Acompanhe o status de suas solicitações de Materiais, Serviços, Viagens, Reembolsos e Contratação de RH.</CardDescription></div>
              <div className="mb-2 flex items-center justify-end gap-2" style={{ fontSize: fonts.filterPx, ...fontFormatCss(fonts.filterFormat) }}>
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

        </CdeSection><CdeTableOrder embedded /></div>
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
