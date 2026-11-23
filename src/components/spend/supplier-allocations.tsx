import { useState } from "react";
import { Plus, Pencil, Trash2, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { confirmAction } from "@/components/confirm-dialog";
import { supabase } from "@/integrations/supabase/client";
import type { SpendData, SupplierAllocation } from "./data";
import { supplierKey } from "./supplier-key";

export function SpendSupplierAllocations({ data, refresh }: { data: SpendData; refresh: () => Promise<void> }) {
  const [draft, setDraft] = useState<{ id?: string; supplier: string; account_id: string } | null>(null);
  const [busy, setBusy] = useState(false);
  async function save() {
    if (!draft) return;
    if (!draft.supplier.trim() || !draft.account_id) { toast.error("Informe fornecedor e Plano de Contas"); return; }
    if (data.allocations.some(a => a.id !== draft.id && supplierKey(a.supplier) === supplierKey(draft.supplier))) { toast.error("Fornecedor já cadastrado"); return; }
    setBusy(true);
    try {
      const result = await supabase.from("spend_supplier_allocations").upsert({ id: draft.id ?? crypto.randomUUID(), supplier: draft.supplier.trim(), account_id: draft.account_id }).select().single();
      if (result.error) throw result.error;
      const applied = await supabase.rpc("spend_apply_supplier_allocations");
      if (applied.error) throw applied.error;
      await refresh(); setDraft(null); toast.success(`De-Para salvo · ${applied.data} movimentos alocados`);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Não foi possível salvar o De-Para"); } finally { setBusy(false); }
  }
  async function remove(row: SupplierAllocation) {
    if (!await confirmAction(`Excluir o De-Para de ${row.supplier}? As classificações já gravadas serão preservadas.`, { title: "Excluir alocação automática" })) return;
    setBusy(true);
    try { const result = await supabase.from("spend_supplier_allocations").delete().eq("id", row.id).select("id"); if (result.error) throw result.error; if (!result.data?.length) throw new Error("Exclusão não autorizada"); await refresh(); toast.success("De-Para excluído"); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Não foi possível excluir"); } finally { setBusy(false); }
  }
  return <section className="min-w-0 space-y-4">
    <div className="flex items-center gap-3"><h2 className="min-w-0 text-lg">Fornecedores → Plano de Contas</h2><Button variant="ghost" size="icon" title="Adicionar fornecedor" aria-label="Adicionar fornecedor" disabled={busy} onClick={() => setDraft({ supplier: "", account_id: "" })}><Plus /></Button></div>
    <Table><TableHeader><TableRow><TableHead>Fornecedor</TableHead><TableHead>Plano de Contas</TableHead><TableHead>Ações</TableHead></TableRow></TableHeader><TableBody>{data.allocations.map(row => <TableRow key={row.id}><TableCell>{row.supplier}</TableCell><TableCell>{data.accounts.find(a => a.id === row.account_id)?.name ?? "Conta indisponível"}</TableCell><TableCell><div className="flex items-center gap-1"><Button variant="ghost" size="icon" title="Editar fornecedor" aria-label={`Editar ${row.supplier}`} disabled={busy} onClick={() => setDraft(row)}><Pencil /></Button><Button variant="ghost" size="icon" title="Excluir fornecedor" aria-label={`Excluir ${row.supplier}`} disabled={busy} onClick={() => void remove(row)}><Trash2 /></Button></div></TableCell></TableRow>)}</TableBody></Table>
    {!data.allocations.length && <p className="text-sm text-muted-foreground">Nenhum fornecedor cadastrado.</p>}
    <Dialog open={!!draft} onOpenChange={open => { if (!open && !busy) setDraft(null); }}><DialogContent><DialogHeader><DialogTitle>{draft?.id ? "Editar fornecedor" : "Adicionar fornecedor"}</DialogTitle></DialogHeader>{draft && <form className="space-y-4" onSubmit={e => { e.preventDefault(); void save(); }}><div><Label htmlFor="spend-supplier">Fornecedor (descrição da fatura)</Label><Input id="spend-supplier" value={draft.supplier} disabled={busy} onChange={e => setDraft({ ...draft, supplier: e.target.value })} /></div><div><Label>Plano de Contas</Label><SearchableSelect aria-label="Plano de Contas do fornecedor" value={draft.account_id} onChange={account_id => setDraft({ ...draft, account_id })} options={data.accounts.map(a => ({ value: a.id, label: a.name }))} disabled={busy} /></div><Button type="submit" variant="ghost" size="icon" title="Salvar De-Para" aria-label="Salvar De-Para" disabled={busy}><Save /></Button></form>}</DialogContent></Dialog>
  </section>;
}