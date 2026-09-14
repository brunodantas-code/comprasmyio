import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, History, Tags } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Account, BRL, accountLabel, formatDate, isPostingAccount } from "./shared";
import { useCashFlowAccounts } from "./chart-of-accounts-tab";

type Payable = { id: string; source_order_id: string; approval_number: string | null; request_type: string; item_name: string; amount: number; due_date: string | null; status: string; account_id: string | null; projects: { name: string } | null; clients: { name: string } | null; cost_centers: { name: string } | null; profiles: { full_name: string } | null };
const statusLabel: Record<string, string> = { a_classificar: "A classificar", a_pagar: "A pagar", pago: "Pago", parcialmente_conciliado: "Parcialmente conciliado", conciliado: "Conciliado", cancelado: "Cancelado" };

export function PayablesTab({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const [status, setStatus] = useState("all");
  const { data: accounts = [] } = useCashFlowAccounts();
  const postingAccounts = useMemo(() => accounts.filter((item) => isPostingAccount(item, accounts)), [accounts]);
  const { data: payables = [], isLoading } = useQuery({ queryKey: ["cash-flow-payables"], queryFn: async () => {
    const { data, error } = await supabase.from("cash_flow_payables").select("id,source_order_id,approval_number,request_type,item_name,amount,due_date,status,account_id,projects(name),clients(name),cost_centers(name),profiles!cash_flow_payables_requester_id_fkey(full_name)").order("created_at", { ascending: false });
    if (error) throw error;
    return data as unknown as Payable[];
  }});
  const visible = status === "all" ? payables : payables.filter((item) => item.status === status);
  const pendingTotal = payables.filter((item) => !["conciliado", "cancelado"].includes(item.status)).reduce((sum, item) => sum + Number(item.amount), 0);
  const classify = useMutation({ mutationFn: async ({ payable, accountId }: { payable: Payable; accountId: string }) => {
    const { error } = await supabase.from("cash_flow_payables").update({ account_id: accountId, status: "a_pagar", classified_by: userId, classified_at: new Date().toISOString() }).eq("id", payable.id);
    if (error) throw error;
  }, onSuccess: () => { toast.success("Pagamento classificado"); qc.invalidateQueries({ queryKey: ["cash-flow-payables"] }); }, onError: (error: Error) => toast.error(error.message) });

  return <div className="space-y-5">
    <div className="grid gap-3 sm:grid-cols-3"><Summary label="Approvals recebidos" value={String(payables.length)} /><Summary label="A classificar" value={String(payables.filter((item) => item.status === "a_classificar").length)} /><Summary label="Total pendente" value={BRL.format(pendingTotal)} /></div>
    <Card><CardHeader className="gap-3 sm:flex-row sm:items-end sm:justify-between"><div><CardTitle>Contas a pagar</CardTitle><CardDescription>Approvals concluídos no myio supply.</CardDescription></div><div className="w-full sm:w-52"><Select value={status} onValueChange={setStatus}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todas as situações</SelectItem>{Object.entries(statusLabel).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div></CardHeader><CardContent>
      {isLoading ? <p className="text-sm text-muted-foreground">Carregando...</p> : !visible.length ? <p className="text-sm text-muted-foreground">Nenhum pagamento nesta situação.</p> : <Table><TableHeader><TableRow><TableHead>Approval</TableHead><TableHead>Descrição</TableHead><TableHead>Alocação</TableHead><TableHead>Centro de custo</TableHead><TableHead>Vencimento</TableHead><TableHead className="text-right">Valor</TableHead><TableHead>Conta</TableHead><TableHead>Situação</TableHead><TableHead aria-label="Detalhes" /></TableRow></TableHeader><TableBody>{visible.map((payable) => <TableRow key={payable.id}>
        <TableCell className="font-mono text-xs font-normal">{payable.approval_number ?? "—"}</TableCell><TableCell><p className="font-medium">{payable.item_name}</p><p className="text-xs text-muted-foreground">{payable.profiles?.full_name ?? payable.request_type}</p></TableCell><TableCell>{payable.projects?.name ?? payable.clients?.name ?? "Interna"}</TableCell><TableCell>{payable.cost_centers?.name ?? "—"}</TableCell><TableCell>{formatDate(payable.due_date)}</TableCell><TableCell className="text-right font-semibold">{BRL.format(Number(payable.amount))}</TableCell><TableCell className="min-w-52"><Select value={payable.account_id ?? undefined} onValueChange={(accountId) => classify.mutate({ payable, accountId })} disabled={classify.isPending || ["conciliado", "cancelado"].includes(payable.status)}><SelectTrigger><SelectValue placeholder="Classificar conta" /></SelectTrigger><SelectContent>{postingAccounts.map((account) => <SelectItem key={account.id} value={account.id}>{accountLabel(account)}</SelectItem>)}</SelectContent></Select></TableCell><TableCell><Badge variant={payable.status === "a_classificar" ? "destructive" : "outline"}>{statusLabel[payable.status] ?? payable.status}</Badge></TableCell><TableCell><PayableHistory payable={payable} accounts={accounts} /></TableCell>
      </TableRow>)}</TableBody></Table>}
    </CardContent></Card>
  </div>;
}

function Summary({ label, value }: { label: string; value: string }) { return <Card><CardContent className="pt-5"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-bold text-foreground">{value}</p></CardContent></Card>; }

function PayableHistory({ payable, accounts }: { payable: Payable; accounts: Account[] }) {
  const { data: logs = [] } = useQuery({ queryKey: ["cash-flow-payable-logs", payable.id], queryFn: async () => { const { data, error } = await supabase.from("cash_flow_payable_logs").select("id,action,details,created_at").eq("payable_id", payable.id).order("created_at", { ascending: false }); if (error) throw error; return data; }, enabled: false });
  const account = accounts.find((item) => item.id === payable.account_id);
  return <Dialog><DialogTrigger asChild><Button size="icon" variant="ghost" title="Ver detalhes" aria-label="Ver detalhes"><History className="h-4 w-4" /></Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Approval {payable.approval_number ?? "sem número"}</DialogTitle></DialogHeader><div className="grid gap-3 text-sm sm:grid-cols-2"><div><span className="text-muted-foreground">Descrição</span><p>{payable.item_name}</p></div><div><span className="text-muted-foreground">Valor</span><p className="font-semibold">{BRL.format(Number(payable.amount))}</p></div><div><span className="text-muted-foreground">Plano de Contas</span><p>{account ? accountLabel(account) : "A classificar"}</p></div><div><span className="text-muted-foreground">Situação</span><p>{statusLabel[payable.status]}</p></div></div><Button asChild variant="outline"><a href={`/dashboard?approval=${payable.source_order_id}`}><ExternalLink className="h-4 w-4" />Abrir no myio supply</a></Button>{logs.length ? <div className="space-y-2"><p className="font-medium">Histórico financeiro</p>{logs.map((log) => <div key={log.id} className="border-l-2 border-myio-purple pl-3"><p>{log.action}</p><p className="text-xs text-muted-foreground">{new Date(log.created_at).toLocaleString("pt-BR")}</p></div>)}</div> : <p className="flex items-center gap-2 text-sm text-muted-foreground"><Tags className="h-4 w-4" />O histórico financeiro aparecerá após a primeira alteração.</p>}</DialogContent></Dialog>;
}