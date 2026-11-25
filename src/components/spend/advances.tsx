import { useState, type ReactNode } from "react";
import { Check, ChevronDown, ChevronUp, Lock, Plus, RotateCcw, Save } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { BRL, formatDate } from "@/components/cash-flow/shared";
import { spendAdvance, type Receipt, type SpendAdvance, type SpendData } from "./data";
import { advanceBalance, advanceCloseLabels, advanceCloseRequirement, advanceStatusLabels } from "./advance";
import { AdvanceIcon } from "./icons";
import { formatSpendAmount, parseSpendAmount } from "./amount";
import { categories } from "./rules";

type ReceiptActions = (receipt: Receipt) => ReactNode;

function BalanceBar({ advance, receipts }: { advance: SpendAdvance; receipts: Receipt[] }) {
  const b = advanceBalance(advance, receipts);
  const pct = b.amount ? Math.min(100, Math.round((b.sent / b.amount) * 100)) : 0;
  return <div className="space-y-1"><Progress value={pct} className="h-1.5 bg-muted" aria-label="Prestação de contas do adiantamento" /><div className="grid grid-cols-3 gap-2 text-xs tabular-nums"><span><span className="block text-muted-foreground">Adiantado</span>{BRL.format(b.amount)}</span><span><span className="block text-muted-foreground">Comprovado</span>{BRL.format(b.sent)}{b.pendingReview > 0 && <span className="block text-muted-foreground">{BRL.format(b.pendingReview)} em análise</span>}</span><span className="text-right"><span className="block text-muted-foreground">Saldo a comprovar</span><strong>{BRL.format(b.remaining)}</strong></span></div></div>;
}

function AdvanceReceiptRow({ receipt, data, actions }: { receipt: Receipt; data: SpendData; actions?: ReactNode }) {
  return <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 py-2">
    <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-start gap-2"><Badge className="shrink-0" title="Adiantamento" aria-label="Adiantamento"><AdvanceIcon className="size-3.5" /></Badge><div className="min-w-0"><p className="truncate text-sm" title={receipt.merchant}>{receipt.merchant}</p><p className="truncate text-xs text-muted-foreground">{formatDate(receipt.date)} · {data.settings[receipt.category]?.name || categories.find(c => c.key === receipt.category)?.name || receipt.category} · {receipt.status === "approved" ? "Aprovado pelo Financeiro" : "Aguardando aprovação"}</p></div></div>
    <div className="flex shrink-0 items-center gap-1"><strong className="text-sm tabular-nums">{BRL.format(receipt.amount)}</strong>{actions}</div>
  </div>;
}

/** Bloco do colaborador: prestações abertas, destacadas dos comprovantes de cartão e reembolso. */
export function SpendAdvanceAccountability({ data, holderId, receiptActions }: { data: SpendData; holderId: string; receiptActions: ReceiptActions }) {
  const advances = data.advances.filter(a => a.holder_id === holderId && a.status === "open");
  if (!advances.length) return null;
  return <section aria-label="Prestação de contas de adiantamentos" className="space-y-3 rounded-md border border-border p-3">
    <h2 className="flex items-center gap-2 text-sm"><AdvanceIcon className="size-4 text-primary" />Prestação de contas · Adiantamentos</h2>
    {advances.map(a => { const linked = data.receipts.filter(r => r.advance_id === a.id); return <div key={a.id} className="space-y-2 border-t border-border pt-2 first:border-t-0 first:pt-0">
      <p className="text-sm">{a.purpose || "Adiantamento"} <span className="text-xs text-muted-foreground">· pago em {formatDate(a.paid_at)}{a.due_at ? ` · prestar contas até ${formatDate(a.due_at)}` : ""}</span></p>
      <BalanceBar advance={a} receipts={data.receipts} />
      <div className="divide-y divide-border">{linked.map(r => <AdvanceReceiptRow key={r.id} receipt={r} data={data} actions={receiptActions(r)} />)}{!linked.length && <p className="py-2 text-xs text-muted-foreground">Nenhum comprovante enviado. Use Salvar Comprovante Fiscal e escolha Adiantamento.</p>}</div>
    </div>; })}
  </section>;
}

function NewAdvanceDialog({ data, refresh }: { data: SpendData; refresh: () => Promise<void> }) {
  const empty = { holder_id: "", amountText: "", paid_at: new Date().toLocaleDateString("en-CA"), due_at: "", purpose: "", project_id: "" };
  const [open, setOpen] = useState(false); const [busy, setBusy] = useState(false); const [d, setD] = useState(empty);
  const amount = parseSpendAmount(d.amountText);
  async function save() {
    if (!d.holder_id || !amount || amount <= 0 || !d.paid_at) { toast.error("Informe colaborador, valor e data do pagamento"); return; }
    setBusy(true);
    try { await spendAdvance("create", { holder_id: d.holder_id, amount, paid_at: d.paid_at, due_at: d.due_at || null, purpose: d.purpose, project_id: d.project_id || null }); await refresh(); toast.success("Adiantamento registrado"); setOpen(false); setD(empty); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Não foi possível registrar"); } finally { setBusy(false); }
  }
  return <><Button onClick={() => setOpen(true)}><Plus />Novo adiantamento</Button><Dialog open={open} onOpenChange={o => { if (!busy) setOpen(o); }}><DialogContent aria-describedby={undefined}><DialogHeader><DialogTitle>Novo adiantamento de despesas</DialogTitle></DialogHeader>
    <label className="space-y-1"><Label>Colaborador *</Label><SearchableSelect aria-label="Colaborador do adiantamento" value={d.holder_id} onChange={holder_id => setD({ ...d, holder_id })} options={data.users.map(u => ({ value: u.id, label: u.name }))} placeholder="Selecionar colaborador" /></label>
    <div className="grid grid-cols-2 items-end gap-4"><label className="flex flex-col gap-1"><Label>Valor (R$) *</Label><Input inputMode="decimal" aria-label="Valor adiantado" value={d.amountText} onChange={e => setD({ ...d, amountText: e.target.value })} onBlur={() => { if (amount !== null) setD({ ...d, amountText: formatSpendAmount(amount) }); }} /></label><label className="flex flex-col gap-1"><Label>Data do pagamento *</Label><Input type="date" aria-label="Data do pagamento do adiantamento" value={d.paid_at} onChange={e => setD({ ...d, paid_at: e.target.value })} /></label></div>
    <div className="grid grid-cols-2 items-end gap-4"><label className="flex flex-col gap-1"><Label>Prestar contas até</Label><Input type="date" aria-label="Prazo da prestação de contas" value={d.due_at} onChange={e => setD({ ...d, due_at: e.target.value })} /></label><label className="flex min-w-0 flex-col gap-1"><Label>Projeto (opcional)</Label><SearchableSelect aria-label="Projeto do adiantamento" value={d.project_id} onChange={project_id => setD({ ...d, project_id })} options={data.projects.map(p => ({ value: p.id, label: p.name }))} placeholder="Projeto" /></label></div>
    <label className="space-y-1"><Label>Finalidade</Label><Textarea aria-label="Finalidade do adiantamento" value={d.purpose} maxLength={500} onChange={e => setD({ ...d, purpose: e.target.value })} /></label>
    <div className="flex justify-end"><Button variant="ghost" size="icon" title="Salvar adiantamento" aria-label="Salvar adiantamento" disabled={busy} onClick={() => void save()}><Save /></Button></div>
  </DialogContent></Dialog></>;
}

function ApproveAdvanceReceipt({ receipt, data, refresh }: { receipt: Receipt; data: SpendData; refresh: () => Promise<void> }) {
  const cfg = data.settings[receipt.category];
  const [account, setAccount] = useState(receipt.finance_account_id ?? cfg?.account_id ?? ""); const [center, setCenter] = useState(receipt.finance_cost_center_id ?? cfg?.cost_center_id ?? ""); const [busy, setBusy] = useState(false);
  async function run(action: "approve_receipt" | "reopen_receipt") {
    setBusy(true);
    try { await spendAdvance(action, { receipt_id: receipt.id, account_id: account || null, cost_center_id: center || null }); await refresh(); toast.success(action === "approve_receipt" ? "Comprovante aprovado" : "Comprovante voltou para análise"); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Não foi possível concluir"); } finally { setBusy(false); }
  }
  const approved = receipt.status === "approved";
  return <div className="grid grid-cols-1 items-end gap-2 pb-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
    <label className="min-w-0 space-y-1"><Label>Plano de Contas</Label><SearchableSelect aria-label={`Plano de Contas de ${receipt.merchant}`} disabled={approved} value={account} onChange={setAccount} options={data.accounts.map(a => ({ value: a.id, label: a.name }))} placeholder="Selecionar conta contábil" /></label>
    <label className="min-w-0 space-y-1"><Label>Centro de Custo</Label><SearchableSelect aria-label={`Centro de Custo de ${receipt.merchant}`} disabled={approved} value={center} onChange={setCenter} options={data.centers.map(a => ({ value: a.id, label: a.name }))} placeholder="Selecionar Centro de Custo" /></label>
    {approved ? <Button variant="ghost" disabled={busy} onClick={() => void run("reopen_receipt")}><RotateCcw />Reabrir</Button> : <Button disabled={busy || !account || !center} onClick={() => void run("approve_receipt")}><Check />Aprovar</Button>}
  </div>;
}

function CloseAdvanceDialog({ advance, data, refresh }: { advance: SpendAdvance; data: SpendData; refresh: () => Promise<void> }) {
  const [open, setOpen] = useState(false); const [kind, setKind] = useState(""); const [note, setNote] = useState(""); const [busy, setBusy] = useState(false);
  const requirement = advanceCloseRequirement(advance, data.receipts); const b = advanceBalance(advance, data.receipts);
  async function close() {
    setBusy(true);
    try { await spendAdvance("close", { advance_id: advance.id, close_kind: requirement === "settled" ? "settled" : kind, note }); await refresh(); toast.success("Prestação de contas encerrada"); setOpen(false); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Não foi possível encerrar"); } finally { setBusy(false); }
  }
  return <><TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" aria-label="Encerrar prestação de contas" disabled={requirement === "pending_receipts"} onClick={() => setOpen(true)}><Lock /></Button></TooltipTrigger><TooltipContent>{requirement === "pending_receipts" ? "Aprove os comprovantes pendentes antes de encerrar" : "Encerrar prestação de contas"}</TooltipContent></Tooltip></TooltipProvider>
    <Dialog open={open} onOpenChange={o => { if (!busy) setOpen(o); }}><DialogContent aria-describedby={undefined}><DialogHeader><DialogTitle>Encerrar prestação de contas</DialogTitle></DialogHeader>
      {requirement === "settled" ? <p className="text-sm">Todo o valor adiantado foi comprovado e aprovado.</p> : <><p className="text-sm">Saldo não comprovado: <strong>{BRL.format(b.remaining)}</strong></p><RadioGroup aria-label="Destino do saldo" value={kind} onValueChange={setKind} className="gap-1">{(["returned", "discounted"] as const).map(k => <label key={k} className="flex min-h-11 items-center gap-2 text-sm"><RadioGroupItem value={k} /><span>{advanceCloseLabels[k]}</span></label>)}</RadioGroup></>}
      <label className="space-y-1"><Label>Observação {requirement === "settled" ? "(opcional)" : "*"}</Label><Textarea aria-label="Observação do encerramento" value={note} onChange={e => setNote(e.target.value)} /></label>
      <div className="flex justify-end"><Button disabled={busy || (requirement !== "settled" && (!kind || !note.trim()))} onClick={() => void close()}><Lock />Encerrar</Button></div>
    </DialogContent></Dialog></>;
}

/** Aba do Financeiro/Admin: registrar, acompanhar, aprovar comprovantes e encerrar adiantamentos. */
export function SpendAdvancesPanel({ data, refresh, receiptActions }: { data: SpendData; refresh: () => Promise<void>; receiptActions: ReceiptActions }) {
  const [openId, setOpenId] = useState(""); const [status, setStatus] = useState("open");
  const list = data.advances.filter(a => status === "all" || (status === "open" ? a.status === "open" : a.status !== "open"));
  return <section aria-label="Adiantamentos de despesas" className="space-y-4">
    <div className="flex flex-wrap items-end justify-between gap-3"><div className="w-56 space-y-1"><Label>Situação</Label><SearchableSelect aria-label="Situação dos adiantamentos" value={status} clearable={false} onChange={setStatus} options={[{ value: "open", label: "Abertos" }, { value: "done", label: "Encerrados" }, { value: "all", label: "Todos" }]} /></div><NewAdvanceDialog data={data} refresh={refresh} /></div>
    <div className="divide-y divide-border">{list.map(a => { const linked = data.receipts.filter(r => r.advance_id === a.id); const expanded = openId === a.id; return <div key={a.id} className="space-y-2 py-3">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2"><div className="min-w-0"><p className="truncate text-sm"><AdvanceIcon className="mr-1 inline size-4 text-primary" />{data.users.find(u => u.id === a.holder_id)?.name ?? "Colaborador"} · {a.purpose || "Adiantamento"}</p><p className="text-xs text-muted-foreground">Pago em {formatDate(a.paid_at)}{a.due_at ? ` · prazo ${formatDate(a.due_at)}` : ""}{a.project_id ? ` · ${data.projects.find(p => p.id === a.project_id)?.name ?? ""}` : ""} · {linked.length} comprovante(s)</p></div><div className="flex shrink-0 items-center gap-1"><Badge>{advanceStatusLabels[a.status] ?? a.status}</Badge>{a.status === "open" && <CloseAdvanceDialog advance={a} data={data} refresh={refresh} />}<Button variant="ghost" size="icon" aria-expanded={expanded} aria-label={`${expanded ? "Recolher" : "Exibir"} comprovantes do adiantamento`} onClick={() => setOpenId(expanded ? "" : a.id)}>{expanded ? <ChevronUp /> : <ChevronDown />}</Button></div></div>
      <BalanceBar advance={a} receipts={data.receipts} />
      {a.status !== "open" && <p className="text-xs text-muted-foreground">{advanceCloseLabels[a.close_kind ?? ""] ?? ""}{a.close_note ? ` · ${a.close_note}` : ""}{a.closed_at ? ` · ${new Date(a.closed_at).toLocaleDateString("pt-BR")}` : ""}</p>}
      {expanded && <div className="divide-y divide-border">{linked.map(r => <div key={r.id}><AdvanceReceiptRow receipt={r} data={data} actions={receiptActions(r)} />{a.status === "open" && <ApproveAdvanceReceipt receipt={r} data={data} refresh={refresh} />}</div>)}{!linked.length && <p className="py-2 text-xs text-muted-foreground">Nenhum comprovante enviado.</p>}</div>}
    </div>; })}{!list.length && <p className="py-8 text-center text-sm text-muted-foreground">Nenhum adiantamento encontrado.</p>}</div>
  </section>;
}
