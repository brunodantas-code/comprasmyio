import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Link2, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/ui/money-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BankAccount, BRL, formatDate } from "./shared";

type PreviewRow = { posted_at: string; description: string; amount: number; external_id: string | null };
type Transaction = PreviewRow & { id: string; bank_account_id: string; reconciliation_status: string };
type PayableOption = { id: string; approval_number: string | null; item_name: string; amount: number; status: string };
const reconciliationLabel: Record<string, string> = { pendente: "Pendente", parcial: "Parcial", conciliado: "Conciliado", ignorado: "Ignorado" };

function parseMoney(value: string) {
  const clean = value.trim().replace(/\s/g, "");
  if (!clean) return 0;
  const normalized = clean.includes(",") ? clean.replace(/\./g, "").replace(",", ".") : clean;
  return Number(normalized.replace(/[^\d.-]/g, "")) || 0;
}

function isoDate(value: string) {
  const text = value.trim();
  const iso = /^(\d{4})[-/]?(\d{2})[-/]?(\d{2})/.exec(text);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const br = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(text);
  return br ? `${br[3]}-${br[2]}-${br[1]}` : "";
}

function parseCsvLine(line: string, separator: string) {
  const values: string[] = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"' && line[index + 1] === '"') { current += '"'; index += 1; }
    else if (char === '"') quoted = !quoted;
    else if (char === separator && !quoted) { values.push(current.trim()); current = ""; }
    else current += char;
  }
  values.push(current.trim());
  return values;
}

function parseOfx(text: string): PreviewRow[] {
  const blocks = text.match(/<STMTTRN>[\s\S]*?(?=<STMTTRN>|<\/BANKTRANLIST>|$)/gi) ?? [];
  const field = (block: string, name: string) => new RegExp(`<${name}>([^<\\r\\n]+)`, "i").exec(block)?.[1]?.trim() ?? "";
  return blocks.map((block) => ({ posted_at: isoDate(field(block, "DTPOSTED")), amount: Number(field(block, "TRNAMT").replace(",", ".")) || 0, description: field(block, "MEMO") || field(block, "NAME") || "Movimentação bancária", external_id: field(block, "FITID") || null })).filter((item) => item.posted_at && item.amount !== 0);
}

async function digest(value: string) {
  const buffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(buffer)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function CashRegisterTab({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const [selectedAccount, setSelectedAccount] = useState("all");
  const { data: accounts = [] } = useQuery({ queryKey: ["cash-flow-bank-accounts"], queryFn: async () => { const { data, error } = await supabase.from("cash_flow_bank_accounts").select("*").order("name"); if (error) throw error; return data as BankAccount[]; } });
  const { data: transactions = [], isLoading } = useQuery({ queryKey: ["cash-flow-transactions"], queryFn: async () => { const { data, error } = await supabase.from("cash_flow_transactions").select("id,bank_account_id,external_id,posted_at,amount,description,reconciliation_status").order("posted_at", { ascending: false }); if (error) throw error; return data as Transaction[]; } });
  const { data: payables = [] } = useQuery({ queryKey: ["cash-flow-payables-reconcile"], queryFn: async () => { const { data, error } = await supabase.from("cash_flow_payables").select("id,approval_number,item_name,amount,status").in("status", ["a_pagar", "pago", "parcialmente_conciliado"]); if (error) throw error; return data as PayableOption[]; } });
  const visible = selectedAccount === "all" ? transactions : transactions.filter((item) => item.bank_account_id === selectedAccount);
  const balances = useMemo(() => accounts.map((account) => ({ account, balance: Number(account.opening_balance) + transactions.filter((item) => item.bank_account_id === account.id && item.posted_at >= account.opening_balance_date).reduce((sum, item) => sum + Number(item.amount), 0) })), [accounts, transactions]);
  const totalBalance = balances.reduce((sum, item) => sum + item.balance, 0);

  return <div className="space-y-5">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="text-2xl font-bold">Caixa</h2><p className="text-sm text-muted-foreground">Extratos bancários, conciliação e saldo disponível.</p></div><div className="flex flex-wrap gap-2"><BankAccountDialog userId={userId} onDone={() => qc.invalidateQueries({ queryKey: ["cash-flow-bank-accounts"] })} /><ImportDialog userId={userId} accounts={accounts} onDone={() => { qc.invalidateQueries({ queryKey: ["cash-flow-transactions"] }); qc.invalidateQueries({ queryKey: ["cash-flow-bank-accounts"] }); }} /></div></div>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Card><CardContent className="pt-5"><p className="text-sm text-muted-foreground">Saldo disponível</p><p className="mt-1 text-2xl font-bold text-foreground">{BRL.format(totalBalance)}</p></CardContent></Card>{balances.map(({ account, balance }) => <Card key={account.id}><CardContent className="pt-5"><p className="truncate text-sm text-muted-foreground">{account.name}</p><p className="mt-1 text-xl font-bold text-foreground">{BRL.format(balance)}</p><p className="text-xs text-muted-foreground">{account.bank_name}</p></CardContent></Card>)}</div>
    <Card><CardHeader className="gap-3 sm:flex-row sm:items-end sm:justify-between"><div><CardTitle>Movimentações bancárias</CardTitle><CardDescription>Entradas e saídas importadas de OFX ou CSV.</CardDescription></div><div className="w-full sm:w-60"><Select value={selectedAccount} onValueChange={setSelectedAccount}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todas as contas</SelectItem>{accounts.map((account) => <SelectItem key={account.id} value={account.id}>{account.name}</SelectItem>)}</SelectContent></Select></div></CardHeader><CardContent>
      {isLoading ? <p className="text-sm text-muted-foreground">Carregando...</p> : !visible.length ? <p className="text-sm text-muted-foreground">Nenhuma movimentação importada.</p> : <Table><TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Descrição</TableHead><TableHead>Conta bancária</TableHead><TableHead>Tipo</TableHead><TableHead className="text-right">Valor</TableHead><TableHead>Situação</TableHead><TableHead aria-label="Conciliar" /></TableRow></TableHeader><TableBody>{visible.map((transaction) => { const bank = accounts.find((item) => item.id === transaction.bank_account_id); return <TableRow key={transaction.id}><TableCell>{formatDate(transaction.posted_at)}</TableCell><TableCell className="max-w-80 whitespace-normal">{transaction.description}</TableCell><TableCell>{bank?.name ?? "—"}</TableCell><TableCell>{transaction.amount > 0 ? "Entrada" : "Saída"}</TableCell><TableCell className={`text-right font-semibold ${transaction.amount < 0 ? "text-destructive" : "text-primary"}`}>{BRL.format(Number(transaction.amount))}</TableCell><TableCell><Badge variant="outline">{reconciliationLabel[transaction.reconciliation_status] ?? transaction.reconciliation_status}</Badge></TableCell><TableCell>{transaction.amount < 0 && transaction.reconciliation_status !== "conciliado" ? <ReconcileDialog transaction={transaction} payables={payables} userId={userId} /> : null}</TableCell></TableRow>; })}</TableBody></Table>}
    </CardContent></Card>
  </div>;
}

function BankAccountDialog({ userId, onDone }: { userId: string; onDone: () => void }) {
  const [open, setOpen] = useState(false); const [balance, setBalance] = useState("0");
  const save = useMutation({ mutationFn: async (form: FormData) => { const { error } = await supabase.from("cash_flow_bank_accounts").insert({ name: String(form.get("name") ?? "").trim(), bank_name: String(form.get("bank_name") ?? "").trim(), agency: String(form.get("agency") ?? "").trim() || null, account_number: String(form.get("account_number") ?? "").trim() || null, opening_balance: Number(balance), opening_balance_date: String(form.get("opening_balance_date")), created_by: userId }); if (error) throw error; }, onSuccess: () => { toast.success("Conta bancária criada"); setOpen(false); onDone(); }, onError: (error: Error) => toast.error(error.message) });
  return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button variant="outline"><Building2 className="h-4 w-4" />Nova conta bancária</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Nova conta bancária</DialogTitle></DialogHeader><form className="space-y-4" onSubmit={(event) => { event.preventDefault(); save.mutate(new FormData(event.currentTarget)); }}><div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label>Identificação</Label><Input name="name" required placeholder="Ex.: Conta principal" /></div><div className="space-y-2"><Label>Banco</Label><Input name="bank_name" required /></div><div className="space-y-2"><Label>Agência</Label><Input name="agency" /></div><div className="space-y-2"><Label>Conta</Label><Input name="account_number" /></div><div className="space-y-2"><Label>Saldo inicial</Label><MoneyInput value={balance} onChange={setBalance} /></div><div className="space-y-2"><Label>Data do saldo</Label><Input name="opening_balance_date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required /></div></div><DialogFooter><Button type="submit" disabled={save.isPending}>Salvar</Button></DialogFooter></form></DialogContent></Dialog>;
}

function ImportDialog({ userId, accounts, onDone }: { userId: string; accounts: BankAccount[]; onDone: () => void }) {
  const [open, setOpen] = useState(false); const [bankAccountId, setBankAccountId] = useState(""); const [file, setFile] = useState<File | null>(null); const [preview, setPreview] = useState<PreviewRow[]>([]); const [csvRows, setCsvRows] = useState<string[][]>([]); const [headers, setHeaders] = useState<string[]>([]); const [mapping, setMapping] = useState({ date: "", description: "", amount: "" }); const [fileText, setFileText] = useState("");
  async function readFile(selected: File | null) { setFile(selected); setPreview([]); setCsvRows([]); if (!selected) return; const text = await selected.text(); setFileText(text); if (selected.name.toLowerCase().endsWith(".ofx")) setPreview(parseOfx(text)); else { const lines = text.split(/\r?\n/).filter(Boolean); const separator = (lines[0]?.match(/;/g)?.length ?? 0) >= (lines[0]?.match(/,/g)?.length ?? 0) ? ";" : ","; const parsed = lines.map((line) => parseCsvLine(line, separator)); setHeaders(parsed[0] ?? []); setCsvRows(parsed.slice(1)); } }
  function mapCsv() { const d = Number(mapping.date); const desc = Number(mapping.description); const amount = Number(mapping.amount); setPreview(csvRows.map((row) => ({ posted_at: isoDate(row[d] ?? ""), description: row[desc]?.trim() || "Movimentação bancária", amount: parseMoney(row[amount] ?? ""), external_id: null })).filter((item) => item.posted_at && item.amount !== 0)); }
  const save = useMutation({ mutationFn: async () => { if (!file || !bankAccountId || !preview.length) throw new Error("Selecione a conta e gere uma prévia válida."); const fileHash = await digest(fileText); const { data: batch, error: batchError } = await supabase.from("cash_flow_statement_imports").insert({ bank_account_id: bankAccountId, file_name: file.name, file_format: file.name.toLowerCase().endsWith(".ofx") ? "ofx" : "csv", file_hash: fileHash, row_count: preview.length, imported_by: userId }).select("id").single(); if (batchError) { if (batchError.code === "23505") throw new Error("Este arquivo já foi importado para a conta selecionada."); throw batchError; } const rows = await Promise.all(preview.map(async (item) => ({ ...item, bank_account_id: bankAccountId, import_id: batch.id, created_by: userId, dedupe_key: await digest(`${bankAccountId}|${item.external_id ?? ""}|${item.posted_at}|${item.amount}|${item.description}`) }))); const { error } = await supabase.from("cash_flow_transactions").upsert(rows, { onConflict: "bank_account_id,dedupe_key", ignoreDuplicates: true }); if (error) throw error; }, onSuccess: () => { toast.success(`${preview.length} movimentações importadas`); setOpen(false); setFile(null); setPreview([]); onDone(); }, onError: (error: Error) => toast.error(error.message) });
  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger asChild><Button disabled={!accounts.length}><Upload className="h-4 w-4" />Importar extrato</Button></DialogTrigger>
    <DialogContent className="max-w-3xl">
      <DialogHeader><DialogTitle>Importar extrato</DialogTitle><DialogDescription>Selecione a conta e confira as movimentações antes de importar.</DialogDescription></DialogHeader>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2"><Label>Conta bancária</Label><Select value={bankAccountId} onValueChange={setBankAccountId}><SelectTrigger><SelectValue placeholder="Selecionar conta" /></SelectTrigger><SelectContent>{accounts.filter((item) => item.active).map((account) => <SelectItem key={account.id} value={account.id}>{account.name}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-2"><Label>Arquivo OFX ou CSV</Label><Input type="file" accept=".ofx,.csv,text/csv,application/x-ofx" onChange={(event) => void readFile(event.target.files?.[0] ?? null)} /></div>
      </div>
      {headers.length ? <div className="grid gap-3 sm:grid-cols-3">
        {([[
          "date", "Coluna de data",
        ], [
          "description", "Coluna de descrição",
        ], [
          "amount", "Coluna de valor",
        ]] as const).map(([key, label]) => <div key={key} className="space-y-2">
          <Label>{label}</Label>
          <Select value={mapping[key]} onValueChange={(value) => setMapping((old) => ({ ...old, [key]: value }))}>
            <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
            <SelectContent>{headers.map((header, index) => <SelectItem key={`${header}-${index}`} value={String(index)}>{header || `Coluna ${index + 1}`}</SelectItem>)}</SelectContent>
          </Select>
        </div>)}
        <Button type="button" variant="outline" className="sm:col-span-3" onClick={mapCsv}>Gerar prévia</Button>
      </div> : null}
      {preview.length ? <div className="max-h-64 overflow-auto rounded-md border"><Table><TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Descrição</TableHead><TableHead className="text-right">Valor</TableHead></TableRow></TableHeader><TableBody>{preview.slice(0, 20).map((row, index) => <TableRow key={`${row.posted_at}-${index}`}><TableCell>{formatDate(row.posted_at)}</TableCell><TableCell>{row.description}</TableCell><TableCell className="text-right">{BRL.format(row.amount)}</TableCell></TableRow>)}</TableBody></Table></div> : file ? <p className="text-sm text-muted-foreground">Nenhuma movimentação válida encontrada.</p> : null}
      <DialogFooter><Button onClick={() => save.mutate()} disabled={!preview.length || !bankAccountId || save.isPending}>Confirmar importação</Button></DialogFooter>
    </DialogContent>
  </Dialog>;
}

function ReconcileDialog({ transaction, payables, userId }: { transaction: Transaction; payables: PayableOption[]; userId: string }) {
  const [open, setOpen] = useState(false); const [payableId, setPayableId] = useState(""); const [amount, setAmount] = useState(String(Math.abs(transaction.amount))); const qc = useQueryClient();
  const save = useMutation({ mutationFn: async () => { const { error } = await supabase.from("cash_flow_reconciliations").insert({ transaction_id: transaction.id, payable_id: payableId, matched_amount: Number(amount), matched_by: userId }); if (error) throw error; }, onSuccess: () => { toast.success("Movimentação conciliada"); setOpen(false); qc.invalidateQueries({ queryKey: ["cash-flow-transactions"] }); qc.invalidateQueries({ queryKey: ["cash-flow-payables"] }); qc.invalidateQueries({ queryKey: ["cash-flow-payables-reconcile"] }); }, onError: (error: Error) => toast.error(error.message) });
  return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button size="icon" variant="ghost" title="Conciliar" aria-label="Conciliar"><Link2 className="h-4 w-4" /></Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Conciliar saída</DialogTitle><DialogDescription>{transaction.description} · {BRL.format(Math.abs(transaction.amount))}</DialogDescription></DialogHeader><div className="space-y-4"><div className="space-y-2"><Label>Pagamento</Label><Select value={payableId} onValueChange={setPayableId}><SelectTrigger><SelectValue placeholder="Selecionar pagamento" /></SelectTrigger><SelectContent>{payables.map((payable) => <SelectItem key={payable.id} value={payable.id}>{payable.approval_number ?? "Sem número"} · {payable.item_name} · {BRL.format(payable.amount)}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label>Valor conciliado</Label><MoneyInput value={amount} onChange={setAmount} /></div></div><DialogFooter><Button onClick={() => save.mutate()} disabled={!payableId || Number(amount) <= 0 || save.isPending}>Conciliar</Button></DialogFooter></DialogContent></Dialog>;
}