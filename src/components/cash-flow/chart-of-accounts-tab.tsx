import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, Pencil, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/ui/money-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Account, BRL, MONTHS, accountLabel } from "./shared";

type Budget = { id: string; account_id: string; fiscal_year: number } & Record<(typeof MONTHS)[number][0], number>;
const natures = [["despesa", "Despesa"], ["receita", "Receita"], ["ativo", "Ativo"], ["passivo", "Passivo"], ["resultado", "Resultado"]] as const;

export function useCashFlowAccounts() {
  return useQuery({ queryKey: ["cash-flow-accounts"], queryFn: async () => {
    const { data, error } = await supabase.from("cash_flow_accounts").select("id,code,name,nature,parent_id,accepts_entries,active").order("code");
    if (error) throw error;
    return data as Account[];
  }});
}

export function ChartOfAccountsTab({ userId }: { userId: string }) {
  const yearNow = new Date().getFullYear();
  const [year, setYear] = useState(yearNow);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Record<string, string>>>({});
  const qc = useQueryClient();
  const { data: accounts = [], isLoading } = useCashFlowAccounts();
  const { data: budgets = [] } = useQuery({ queryKey: ["cash-flow-budgets", year], queryFn: async () => {
    const { data, error } = await supabase.from("cash_flow_budgets").select("*").eq("fiscal_year", year);
    if (error) throw error;
    return data as Budget[];
  }});

  const budgetByAccount = useMemo(() => new Map(budgets.map((item) => [item.account_id, item])), [budgets]);
  const children = useMemo(() => new Set(accounts.map((item) => item.parent_id).filter(Boolean)), [accounts]);
  const rows = useMemo(() => {
    const result: Array<{ account: Account; depth: number }> = [];
    const walk = (parent: string | null, depth: number) => accounts.filter((a) => a.parent_id === parent).forEach((account) => { result.push({ account, depth }); walk(account.id, depth + 1); });
    walk(null, 0);
    return result;
  }, [accounts]);

  const saveAccount = useMutation({ mutationFn: async (value: { id?: string; code: string; name: string; nature: string; parent_id: string | null; accepts_entries: boolean }) => {
    if (value.id) {
      const { id, ...changes } = value;
      const { error } = await supabase.from("cash_flow_accounts").update(changes).eq("id", id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from("cash_flow_accounts").insert({ ...value, created_by: userId });
      if (error) throw error;
    }
  }, onSuccess: () => { toast.success(editing ? "Conta atualizada" : "Conta criada"); setOpen(false); setEditing(null); qc.invalidateQueries({ queryKey: ["cash-flow-accounts"] }); }, onError: (error: Error) => toast.error(error.message) });

  const removeAccount = useMutation({ mutationFn: async (id: string) => {
    const { error } = await supabase.from("cash_flow_accounts").delete().eq("id", id);
    if (error) throw error;
  }, onSuccess: () => { toast.success("Conta excluída"); qc.invalidateQueries({ queryKey: ["cash-flow-accounts"] }); }, onError: () => toast.error("Esta conta possui vínculos ou subcontas e não pode ser excluída.") });

  const saveBudget = useMutation({ mutationFn: async (accountId: string) => {
    const current = budgetByAccount.get(accountId);
    const values = Object.fromEntries(MONTHS.map(([key]) => [key, Number(drafts[accountId]?.[key] ?? current?.[key] ?? 0)]));
    const { error } = await supabase.from("cash_flow_budgets").upsert({ account_id: accountId, fiscal_year: year, created_by: userId, ...values }, { onConflict: "account_id,fiscal_year" });
    if (error) throw error;
  }, onSuccess: () => { toast.success("Orçamento salvo"); qc.invalidateQueries({ queryKey: ["cash-flow-budgets", year] }); }, onError: (error: Error) => toast.error(error.message) });

  return <div className="space-y-5">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div><h2 className="text-2xl font-bold">Plano de Contas</h2><p className="text-sm text-muted-foreground">Organize grupos, subcontas e o orçamento mensal.</p></div>
      <div className="flex gap-2">
        <div className="w-28"><Label htmlFor="fiscal-year">Exercício</Label><Input id="fiscal-year" type="number" min={2000} max={2200} value={year} onChange={(e) => setYear(Number(e.target.value) || yearNow)} /></div>
        <Dialog open={open} onOpenChange={(value) => { setOpen(value); if (!value) setEditing(null); }}>
          <DialogTrigger asChild><Button className="self-end"><Plus className="h-4 w-4" />Nova conta</Button></DialogTrigger>
          <AccountDialog account={editing} accounts={accounts} pending={saveAccount.isPending} onSubmit={(value) => saveAccount.mutate(value)} />
        </Dialog>
      </div>
    </div>
    <Card><CardHeader><CardTitle>Orçamento {year}</CardTitle><CardDescription>Valores em reais. Cada linha é salva individualmente.</CardDescription></CardHeader><CardContent>
      {isLoading ? <p className="text-sm text-muted-foreground">Carregando...</p> : !rows.length ? <p className="text-sm text-muted-foreground">Cadastre a primeira conta do plano.</p> : <Table>
        <TableHeader><TableRow><TableHead className="min-w-52">Conta</TableHead>{MONTHS.map(([, label]) => <TableHead key={label} className="min-w-28 text-right">{label}</TableHead>)}<TableHead className="min-w-32 text-right">Total anual</TableHead><TableHead aria-label="Ações" /></TableRow></TableHeader>
        <TableBody>{rows.map(({ account, depth }) => {
          const budget = budgetByAccount.get(account.id);
          const total = MONTHS.reduce((sum, [key]) => sum + Number(drafts[account.id]?.[key] ?? budget?.[key] ?? 0), 0);
          return <TableRow key={account.id} className={!account.active ? "opacity-50" : undefined}>
            <TableCell><div className="flex items-center gap-2" style={{ paddingLeft: `${depth * 16}px` }}><ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /><div><p className="font-medium">{accountLabel(account)}</p><p className="text-xs text-muted-foreground">{account.accepts_entries ? "Conta de lançamento" : "Grupo"}</p></div></div></TableCell>
            {MONTHS.map(([key, label]) => <TableCell key={key}><MoneyInput aria-label={`${label} de ${account.name}`} value={String(drafts[account.id]?.[key] ?? budget?.[key] ?? 0)} onChange={(value) => setDrafts((old) => ({ ...old, [account.id]: { ...old[account.id], [key]: value } }))} className="h-8 min-w-24 text-right" disabled={!account.accepts_entries || children.has(account.id)} /></TableCell>)}
            <TableCell className="text-right font-semibold">{BRL.format(total)}</TableCell>
            <TableCell><div className="flex items-center justify-end gap-1"><Button size="icon" variant="ghost" title="Salvar orçamento" aria-label="Salvar orçamento" onClick={() => saveBudget.mutate(account.id)} disabled={!account.accepts_entries || children.has(account.id) || saveBudget.isPending}><Save className="h-4 w-4" /></Button><Button size="icon" variant="ghost" title="Editar conta" aria-label="Editar conta" onClick={() => { setEditing(account); setOpen(true); }}><Pencil className="h-4 w-4" /></Button><Button size="icon" variant="ghost" className="text-destructive" title="Excluir conta" aria-label="Excluir conta" onClick={() => removeAccount.mutate(account.id)}><Trash2 className="h-4 w-4" /></Button></div></TableCell>
          </TableRow>;
        })}</TableBody>
      </Table>}
    </CardContent></Card>
  </div>;
}

function AccountDialog({ account, accounts, pending, onSubmit }: { account: Account | null; accounts: Account[]; pending: boolean; onSubmit: (value: { id?: string; code: string; name: string; nature: string; parent_id: string | null; accepts_entries: boolean }) => void }) {
  const [parent, setParent] = useState(account?.parent_id ?? "none");
  const [nature, setNature] = useState(account?.nature ?? "despesa");
  return <DialogContent><DialogHeader><DialogTitle>{account ? "Editar conta" : "Nova conta"}</DialogTitle></DialogHeader><form className="space-y-4" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); onSubmit({ id: account?.id, code: String(form.get("code") ?? "").trim(), name: String(form.get("name") ?? "").trim(), nature, parent_id: parent === "none" ? null : parent, accepts_entries: form.get("accepts_entries") === "on" }); }}>
    <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="account-code">Código</Label><Input id="account-code" name="code" defaultValue={account?.code} required placeholder="Ex.: 3.1.02" /></div><div className="space-y-2"><Label>Natureza</Label><Select value={nature} onValueChange={setNature}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{natures.map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div></div>
    <div className="space-y-2"><Label htmlFor="account-name">Nome</Label><Input id="account-name" name="name" defaultValue={account?.name} required /></div>
    <div className="space-y-2"><Label>Conta superior</Label><Select value={parent} onValueChange={setParent}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Nenhuma — conta principal</SelectItem>{accounts.filter((item) => item.id !== account?.id).map((item) => <SelectItem key={item.id} value={item.id}>{accountLabel(item)}</SelectItem>)}</SelectContent></Select></div>
    <label className="flex items-center gap-2 text-sm"><input name="accepts_entries" type="checkbox" defaultChecked={account?.accepts_entries ?? true} />Aceita lançamentos</label>
    <DialogFooter><Button type="submit" disabled={pending}>Salvar</Button></DialogFooter>
  </form></DialogContent>;
}