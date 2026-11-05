import { Fragment, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronDown, ChevronRight, FileDown } from "lucide-react";
import { useSupplyTags } from "@/components/supply-tags-tab";
import { consolidateTagCosts } from "@/lib/supply-tags";

const money = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const STATUS: Record<string, string> = { pendente: "Pendente", comprado_aguardando: "Comprado", entregue: "Entregue", recebido_ok: "Recebido", recebido_problema: "Recebido c/ problema", cancelado: "Cancelado" };
type Row = { id: string; tag_id: string | null; status: string; estimated_value: number | null; approval_number: string | null; item_name: string; created_at: string; requester_id: string | null };

export function SupplyTagCostReport() {
  const { data: tags } = useSupplyTags();
  const [open, setOpen] = useState<Set<string>>(new Set());
  const { data: orders } = useQuery({
    queryKey: ["supply_tag_cost_orders"],
    queryFn: async () => {
      const { data, error } = await supabase.from("purchase_orders").select("id,tag_id,status,estimated_value,approval_number,item_name,created_at,requester_id").not("tag_id", "is", null).order("created_at");
      if (error) throw error;
      return data as Row[];
    },
  });
  const { data: names } = useQuery({
    queryKey: ["supply_tag_cost_requesters", orders?.length],
    enabled: !!orders?.length,
    queryFn: async () => {
      const ids = [...new Set(orders!.map((o) => o.requester_id).filter(Boolean))] as string[];
      const { data } = await supabase.from("profiles").select("id,full_name").in("id", ids);
      return new Map((data ?? []).map((p) => [p.id, p.full_name as string]));
    },
  });
  const totals = useMemo(() => consolidateTagCosts(orders ?? []), [orders]);
  const groups = (tags ?? []).filter((t) => totals.has(t.id)).map((t) => ({
    tag: t, ...totals.get(t.id)!, rows: (orders ?? []).filter((o) => o.tag_id === t.id && o.status !== "cancelado"),
  })).sort((a, b) => b.total - a.total);
  const grand = groups.reduce((s, g) => s + g.total, 0);
  const toggle = (id: string) => setOpen((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const date = (d: string) => new Date(d).toLocaleDateString("pt-BR");

  async function exportPdf() {
    const { jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");
    const doc = new jsPDF();
    doc.setFontSize(15); doc.text("myio Supply — Custo consolidado por Etiqueta", 14, 16);
    doc.setFontSize(9); doc.text(`Emissão: ${new Date().toLocaleString("pt-BR")} | Total geral: ${money(grand)} (sem canceladas)`, 14, 23);
    const body: string[][] = [];
    for (const g of groups) {
      body.push([g.tag.name + (g.tag.active ? "" : " (inativa)"), `${g.count} solicitação(ões)`, "", money(g.total)]);
      for (const r of g.rows) body.push(["", `${r.approval_number ?? "—"} | ${r.item_name}`, `${date(r.created_at)} | ${(r.requester_id && names?.get(r.requester_id)) || "—"} | ${STATUS[r.status] ?? r.status}`, money(Number(r.estimated_value ?? 0))]);
    }
    autoTable(doc, { startY: 28, head: [["Etiqueta", "Solicitação", "Data / Solicitante / Situação", "Valor"]], body, theme: "plain", styles: { fontSize: 8, cellPadding: 2 }, columnStyles: { 3: { halign: "right" } }, didParseCell: (d) => { if (d.section === "body" && d.row.raw && (d.row.raw as string[])[0]) d.cell.styles.fontStyle = "bold"; } });
    doc.save("Supply-custo-por-etiqueta.pdf");
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle>Custo consolidado por Etiqueta</CardTitle>
        <Button size="sm" variant="action" onClick={exportPdf} disabled={!groups.length}><FileDown className="h-3.5 w-3.5" /> PDF</Button>
      </CardHeader>
      <CardContent>
        {!groups.length ? <p className="text-sm text-muted-foreground">Nenhuma solicitação com etiqueta ainda.</p> : (
          <Table>
            <TableHeader><TableRow><TableHead>Etiqueta</TableHead><TableHead>Solicitações</TableHead><TableHead className="text-right">Valor estimado</TableHead></TableRow></TableHeader>
            <TableBody>
              {groups.map((g) => (<Fragment key={g.tag.id}>
                <TableRow className="cursor-pointer" onClick={() => toggle(g.tag.id)}>
                  <TableCell className="font-medium"><span className="inline-flex items-center gap-1">{open.has(g.tag.id) ? <ChevronDown className="h-4 w-4 text-primary" /> : <ChevronRight className="h-4 w-4 text-primary" />}{g.tag.name}{!g.tag.active && <span className="text-xs text-muted-foreground"> (inativa)</span>}</span></TableCell>
                  <TableCell>{g.count}</TableCell>
                  <TableCell className="text-right font-medium">{money(g.total)}</TableCell>
                </TableRow>
                {open.has(g.tag.id) && g.rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="pl-8 text-sm text-muted-foreground">{r.approval_number ?? "—"} · {r.item_name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{date(r.created_at)} · {(r.requester_id && names?.get(r.requester_id)) || "—"} · {STATUS[r.status] ?? r.status}</TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">{money(Number(r.estimated_value ?? 0))}</TableCell>
                  </TableRow>
                ))}
              </Fragment>))}
              <TableRow><TableCell className="font-medium">Total geral</TableCell><TableCell /><TableCell className="text-right font-medium">{money(grand)}</TableCell></TableRow>
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
