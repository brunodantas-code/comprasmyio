import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { CdeCategoryHeader } from "./cde-category-header";
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
      <CdeCategoryHeader handle={handle} number={number} title="Fontes de cabeçalhos e filtros" hint="Tamanho da fonte dos cabeçalhos de tabela e das barras de filtro em todos os apps" open={open} onToggle={() => setOpen(!open)} />
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
          <div className="space-y-1">
            <Label>Prévia</Label>
            <div aria-label="Prévia das fontes" className="max-w-2xl rounded-md border border-border p-3">
              <div className="mb-2 flex items-center justify-end gap-2" style={{ fontSize: fonts.filterPx }}>
                <span className="text-muted-foreground">Contém</span>
                <span className="text-muted-foreground">Buscar</span>
                <span className="text-muted-foreground">Filtros</span>
              </div>
              <Table style={{ ["--th-fs" as string]: `${fonts.headerPx}px` }}>
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
                    <TableCell className="text-xs">Reembolso de Despesas</TableCell>
                    <TableCell className="text-xs">Pago</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Aplicado imediatamente a todos os apps após salvar. No celular, os campos de busca mantêm 16 px ao serem tocados para evitar o zoom automático.</p>
          <div className="flex items-center gap-2">
            <Button variant="action" onClick={save} disabled={saving || !draft}><Save className="h-4 w-4" />Salvar</Button>
            {draft && <Button variant="action" disabled={saving} onClick={() => setDraft(null)}>Cancelar</Button>}
          </div>
        </div>
      )}
    </section>
  );
}
