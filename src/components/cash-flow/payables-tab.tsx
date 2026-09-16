import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ExternalLink, ListTree, Tags } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Account, BRL, accountLabel, formatDate, formatPeriod, isPostingAccount, monthValue, periodDate } from "./shared";
import { useCashFlowAccounts } from "./chart-of-accounts-tab";

type Payable = { id: string; source_order_id: string; approval_number: string | null; request_type: string; item_name: string; amount: number; due_date: string | null; status: string; account_id: string | null; fiscal_period: string; competence_period: string; cash_period: string; projects: { name: string } | null; clients: { name: string } | null; cost_centers: { name: string } | null; profiles: { full_name: string } | null };
const statusLabel: Record<string, string> = { a_classificar: "Classificar", a_pagar: "A pagar", pago: "Pago", parcialmente_conciliado: "Parcialmente conciliado", conciliado: "Conciliado", cancelado: "Cancelado" };

export function PayablesTab({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const [status, setStatus] = useState("all");
  const { data: accounts = [] } = useCashFlowAccounts();
  const postingAccounts = useMemo(() => accounts.filter((item) => isPostingAccount(item, accounts)), [accounts]);
  const { data: payables = [], isLoading } = useQuery({ queryKey: ["cash-flow-payables"], queryFn: async () => {
    const { data, error } = await supabase.from("cash_flow_payables").select("id,source_order_id,approval_number,request_type,item_name,amount,due_date,status,account_id,fiscal_period,competence_period,cash_period,projects(name),clients(name),cost_centers(name),profiles!cash_flow_payables_requester_id_fkey(full_name)").order("created_at", { ascending: false });
    if (error) throw error;
    return data as unknown as Payable[];
  }});
  const visible = status === "all" ? payables : payables.filter((item) => item.status === status);
  const pendingTotal = payables.filter((item) => !["conciliado", "cancelado"].includes(item.status)).reduce((sum, item) => sum + Number(item.amount), 0);
  return <div className="space-y-5">
    <div className="grid max-w-4xl gap-3 sm:grid-cols-3"><Summary label="Approvals recebidos" value={String(payables.length)} /><Summary label="A classificar" value={String(payables.filter((item) => item.status === "a_classificar").length)} /><Summary label="Total pendente" value={BRL.format(pendingTotal)} /></div>
    <Card><CardHeader className="gap-3 sm:flex-row sm:items-end sm:justify-between"><div><CardTitle>Contas a pagar</CardTitle><CardDescription>Approvals concluídos no myio supply.</CardDescription></div><div className="w-full sm:w-52"><Select value={status} onValueChange={setStatus}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todas as situações</SelectItem>{Object.entries(statusLabel).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div></CardHeader><CardContent>
      {isLoading ? <p className="text-sm text-muted-foreground">Carregando...</p> : !visible.length ? <p className="text-sm text-muted-foreground">Nenhum pagamento nesta situação.</p> : <Table><TableHeader><TableRow><TableHead>Approval</TableHead><TableHead>Descrição</TableHead><TableHead>Alocação</TableHead><TableHead>Centro de custo</TableHead><TableHead>Referências</TableHead><TableHead className="text-right">Valor</TableHead><TableHead>Conta</TableHead><TableHead>Situação</TableHead></TableRow></TableHeader><TableBody>{visible.map((payable) => <TableRow key={payable.id}>
        <TableCell><PayableHistory payable={payable} accounts={accounts} /></TableCell><TableCell><p className="font-medium">{payable.item_name}</p><p className="text-xs text-muted-foreground">{payable.profiles?.full_name ?? payable.request_type}</p></TableCell><TableCell>{payable.projects?.name ?? payable.clients?.name ?? "Interna"}</TableCell><TableCell>{payable.cost_centers?.name ?? "—"}</TableCell><TableCell className="min-w-32 text-xs"><p>Emissão: {formatPeriod(payable.fiscal_period)}</p><p>Competência: {formatPeriod(payable.competence_period)}</p><p>Caixa: {formatPeriod(payable.cash_period)}</p></TableCell><TableCell className="text-right font-semibold">{BRL.format(Number(payable.amount))}</TableCell><TableCell>{accounts.find((item) => item.id === payable.account_id)?.name ?? "—"}</TableCell><TableCell>{payable.status === "a_classificar" ? <ClassifyPayable payable={payable} accounts={postingAccounts} userId={userId} onDone={() => qc.invalidateQueries({ queryKey: ["cash-flow-payables"] })} /> : <Badge variant="status">{statusLabel[payable.status] ?? payable.status}</Badge>}</TableCell>
      </TableRow>)}</TableBody></Table>}
    </CardContent></Card>
  </div>;
}

function Summary({ label, value }: { label: string; value: string }) { return <Card><CardContent className="flex min-h-20 items-center justify-between gap-3 p-4"><p className="text-sm text-muted-foreground">{label}</p><p className="shrink-0 text-right text-xl font-bold text-foreground">{value}</p></CardContent></Card>; }

function ClassifyPayable({ payable, accounts, userId, onDone }: { payable: Payable; accounts: Account[]; userId: string; onDone: () => void }) {
  const [open, setOpen] = useState(false); const [accountId, setAccountId] = useState(payable.account_id ?? ""); const [fiscal, setFiscal] = useState(monthValue(payable.fiscal_period)); const [competence, setCompetence] = useState(monthValue(payable.competence_period)); const [cash, setCash] = useState(monthValue(payable.cash_period));
  const save = useMutation({ mutationFn: async () => { if (!accountId || !fiscal || !competence || !cash) throw new Error("Preencha o Plano de Contas e as três referências mensais."); const { error } = await supabase.from("cash_flow_payables").update({ account_id: accountId, fiscal_period: periodDate(fiscal), competence_period: periodDate(competence), cash_period: periodDate(cash), status: payable.status === "a_classificar" ? "a_pagar" : payable.status, classified_by: userId, classified_at: new Date().toISOString() }).eq("id", payable.id); if (error) throw error; }, onSuccess: () => { toast.success("Classificação salva"); setOpen(false); onDone(); }, onError: (error: Error) => toast.error(error.message) });
  return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button variant="ghost" className="h-auto p-0 hover:bg-transparent" title="Classificar" aria-label="Classificar"><Badge variant="status" className="cursor-pointer">Classificar</Badge></Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Classificar pagamento</DialogTitle></DialogHeader><div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2 sm:col-span-2"><Label>Plano de Contas</Label><AccountPicker accounts={accounts} value={accountId} onValueChange={setAccountId} /></div>{[["Emissão fiscal", fiscal, setFiscal], ["Competência", competence, setCompetence], ["Caixa (previsão)", cash, setCash]].map(([label, value, setter]) => <div key={String(label)} className="space-y-2"><Label>{String(label)}</Label><Input type="month" value={String(value)} onChange={(event) => (setter as (value: string) => void)(event.target.value)} required /></div>)}</div><Button onClick={() => save.mutate()} disabled={save.isPending}>Salvar classificação</Button></DialogContent></Dialog>;
}

function AccountPicker({ accounts, value, onValueChange }: { accounts: Account[]; value: string; onValueChange: (value: string) => void }) {
  const selected = accounts.find((account) => account.id === value);
  const [query, setQuery] = useState(selected ? accountLabel(selected) : "");
  const [showAll, setShowAll] = useState(false);
  const normalized = query.trim().toLocaleLowerCase("pt-BR");
  const visible = showAll || normalized
    ? accounts.filter((account) => showAll || account.code.toLocaleLowerCase("pt-BR").includes(normalized) || account.name.toLocaleLowerCase("pt-BR").includes(normalized))
    : [];

  function updateQuery(next: string) {
    setQuery(next);
    setShowAll(false);
    const exact = accounts.find((account) => account.code.toLocaleLowerCase("pt-BR") === next.trim().toLocaleLowerCase("pt-BR") || account.name.toLocaleLowerCase("pt-BR") === next.trim().toLocaleLowerCase("pt-BR"));
    onValueChange(exact?.id ?? "");
  }

  return <div className="space-y-2">
    <Command shouldFilter={false} className="rounded-md border bg-background">
      <CommandInput value={query} onValueChange={updateQuery} placeholder="Digite o número ou nome da conta" />
      {(showAll || normalized) && <CommandList className="border-t">
        {!visible.length && <CommandEmpty>Nenhuma conta encontrada.</CommandEmpty>}
        <CommandGroup heading={showAll ? "Plano de Contas" : "Sugestões"}>
          {visible.map((account) => <CommandItem key={account.id} value={`${account.code} ${account.name}`} onSelect={() => { onValueChange(account.id); setQuery(accountLabel(account)); setShowAll(false); }}>
            <Check className={account.id === value ? "opacity-100" : "opacity-0"} />
            <span>{accountLabel(account)}</span>
          </CommandItem>)}
        </CommandGroup>
      </CommandList>}
    </Command>
    <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => setShowAll((current) => !current)}>
      <ListTree className="h-4 w-4" />{showAll ? "Ocultar Plano de Contas" : "Exibir todo o Plano de Contas"}
    </Button>
  </div>;
}

function PayableHistory({ payable, accounts }: { payable: Payable; accounts: Account[] }) {
  const [open, setOpen] = useState(false);
  const { data: logs = [] } = useQuery({ queryKey: ["cash-flow-payable-logs", payable.id], queryFn: async () => { const { data, error } = await supabase.from("cash_flow_payable_logs").select("id,action,details,created_at").eq("payable_id", payable.id).order("created_at", { ascending: false }); if (error) throw error; return data; }, enabled: open });
  const account = accounts.find((item) => item.id === payable.account_id);
  return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button variant="link" className="h-auto p-0 font-mono text-xs font-normal !bg-transparent !text-foreground no-underline hover:!bg-transparent hover:!text-primary hover:underline" title="Ver detalhes do approval">{payable.approval_number ?? "—"}</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Approval {payable.approval_number ?? "sem número"}</DialogTitle></DialogHeader><div className="grid gap-3 text-sm sm:grid-cols-2"><div><span className="text-muted-foreground">Descrição</span><p>{payable.item_name}</p></div><div><span className="text-muted-foreground">Valor</span><p className="font-semibold">{BRL.format(Number(payable.amount))}</p></div><div><span className="text-muted-foreground">Plano de Contas</span><p>{account ? accountLabel(account) : "A classificar"}</p></div><div><span className="text-muted-foreground">Situação</span><p>{statusLabel[payable.status]}</p></div><div><span className="text-muted-foreground">Emissão fiscal</span><p>{formatPeriod(payable.fiscal_period)}</p></div><div><span className="text-muted-foreground">Competência</span><p>{formatPeriod(payable.competence_period)}</p></div><div><span className="text-muted-foreground">Caixa</span><p>{formatPeriod(payable.cash_period)}</p></div></div><Button asChild variant="outline"><a href={`/dashboard?approval=${payable.source_order_id}`}><ExternalLink className="h-4 w-4" />Abrir no myio supply</a></Button>{logs.length ? <div className="space-y-2"><p className="font-medium">Histórico financeiro</p>{logs.map((log) => <div key={log.id} className="border-l-2 border-primary pl-3"><p>{log.action}</p><p className="text-xs text-muted-foreground">{new Date(log.created_at).toLocaleString("pt-BR")}</p></div>)}</div> : <p className="flex items-center gap-2 text-sm text-muted-foreground"><Tags className="h-4 w-4" />O histórico financeiro aparecerá após a primeira alteração.</p>}</DialogContent></Dialog>;
}