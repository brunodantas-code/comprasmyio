import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Camera, Check, Loader2, Save, Trash2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { extractSpendDocument } from "@/lib/spend.functions";
import { configuredCategories, expenseSchema, recurringWarning } from "./rules";
import { categoryIcons } from "./icons";
import { deleteSpendReceipt, spendAction, spendFileUrl, uploadSpend, type SpendData, type Line, type Receipt } from "./data";
import { canDeleteSpendReceipt } from "./receipt-edit";
import { confirmAction } from "@/components/confirm-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatSpendAmount, parseSpendAmount } from "./amount";
import { prepareSpendReceipt } from "./receipt-image";
import { spendFiscalLocation, spendStates } from "./fiscal-location";
import { SpendCityField } from "./city-field";
import { paymentSourceSchema } from "./payment-source";
import { advanceAcceptsAmount, advanceBalance } from "./advance";
import { AdvanceIcon } from "./icons";
import { isDelegatedCard } from "./delegation";
import { categoryChangeMessage, categoryChangeNeedsConfirmation } from "./category-check";
import { receiptReading, receiptVerification, type ReceiptReading } from './receipt-verification';
import { BRL, formatDate } from '@/components/cash-flow/shared';
import { SpendReceiptPdfPreview } from './receipt-pdf-preview';

const today = () => new Date().toLocaleDateString("en-CA");

export function SpendCapture({ data, cardId, line, receipt, onDone, onClose }: { data: SpendData; cardId: string; line?: Line; receipt?: Receipt; onDone: () => Promise<void>; onClose: () => void }) {
  const card = data.cards.find(c => c.id === cardId);
  const extract = useServerFn(extractSpendDocument);
  const availableCategories = configuredCategories(data.settings);
  const picker = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [reading, setReading] = useState(false);
  const [analysis, setAnalysis] = useState<ReceiptReading | null>(null);
  const [readError, setReadError] = useState('');
  const analysisRequest = useRef(0);
  const [suggestedCategory, setSuggestedCategory] = useState<string | null>(null);
  const observationRef = useRef<HTMLTextAreaElement>(null);
  const linkedReceipt = !!receipt && data.lines.some(item => item.receipt_id === receipt.id);
  const fixedAmountDate = !!line || linkedReceipt;
  const [path, setPath] = useState(receipt?.file_path ?? "");
  const [preview, setPreview] = useState("");
  const [pdf, setPdf] = useState(receipt?.file_path.toLowerCase().endsWith(".pdf") ?? false);
  const [amountText, setAmountText] = useState(receipt ? formatSpendAmount(receipt.amount) : line?.amount ? formatSpendAmount(line.amount) : "");
  const [draft, setDraft] = useState({ id: receipt?.id ?? crypto.randomUUID(), card_id: cardId, payment_source: receipt?.payment_source ?? (line || isDelegatedCard(data.cards.find(c => c.id === cardId), data.user_id, data.role === "finance") ? "myio_card" : ""), date: receipt?.date ?? line?.date ?? today(), merchant: receipt?.merchant ?? line?.merchant ?? "", amount: receipt?.amount ?? line?.amount ?? 0, category: receipt?.category ?? availableCategories[0]?.key ?? "", observation: receipt?.observation ?? "", project_id: receipt?.project_id ?? null as string | null, file_path: receipt?.file_path ?? "", clear_photo: receipt?.clear_photo ?? false, myio_cnpj: receipt?.myio_cnpj ?? null as boolean | null, city: receipt?.city ?? "", uf: receipt?.uf ?? "", access_key: receipt?.access_key ?? null as string | null, advance_id: receipt?.advance_id ?? "", confirmed: false });
  const openAdvances = data.advances.filter(a => a.holder_id === card?.holder_id && (a.status === "open" || a.id === receipt?.advance_id));
  const selectedAdvance = openAdvances.find(a => a.id === draft.advance_id);
  const advanceOk = draft.payment_source !== "advance" || (!!selectedAdvance && advanceAcceptsAmount(selectedAdvance, data.receipts, draft.amount, receipt ? { advance_id: receipt.advance_id, amount: receipt.amount } : undefined));

  useEffect(() => {
    if (!receipt) return;
    let active = true;
    void spendFileUrl(receipt.file_path).then(url => { if (active) setPreview(url); }).catch(() => { if (active) toast.error("Não foi possível abrir a foto atual"); });
    void readFile(receipt.file_path, false);
    return () => { active = false; analysisRequest.current++; };
  }, [receipt?.id, receipt?.file_path]);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  function change(patch: Partial<typeof draft>) {
    setDraft(current => ({ ...current, ...patch, confirmed: false }));
  }

  const verification = receiptVerification(analysis, line ?? draft);

  async function readFile(filePath: string, applySuggestions: boolean) {
    const request = ++analysisRequest.current;
    setReading(true); setAnalysis(null); setReadError('');
    try {
      const result = await extract({ data: { path: filePath, kind: 'receipt' } });
      if (request !== analysisRequest.current) return;
      const identified = receiptReading(result);
      if (!identified) throw new Error('Selecione um comprovante legível de uma única compra.');
      setAnalysis(identified);
      const item = result.lancamentos[0];
      if (applySuggestions && item) {
        const category = item.categoria_sugerida && availableCategories.some(c => c.key === item.categoria_sugerida) ? item.categoria_sugerida : null;
        setSuggestedCategory(category);
        setDraft(d => ({ ...d, ...spendFiscalLocation(item), date: fixedAmountDate ? d.date : item.data, merchant: line ? d.merchant : item.estabelecimento, amount: fixedAmountDate ? d.amount : item.valor, category: category ?? d.category, myio_cnpj: item.myio_cnpj, confirmed: false }));
        if (!fixedAmountDate) setAmountText(formatSpendAmount(item.valor));
      }
    } catch (error) {
      if (request !== analysisRequest.current) return;
      const message = error instanceof Error ? error.message : 'Não foi possível conferir o comprovante. Tente novamente ou substitua o arquivo.';
      setReadError(message); toast.error(message);
    } finally { if (request === analysisRequest.current) setReading(false); }
  }

  async function filePicked(file: File) {
    if (!card) return;
    setBusy(true);
    try {
      const prepared = await prepareSpendReceipt(file);
      const p = await uploadSpend(prepared, card, draft.date.slice(0, 7));
      setPath(p);
      setDraft(d => ({ ...d, file_path: p, confirmed: false }));
      setPreview(URL.createObjectURL(prepared));
      setPdf(prepared.type === "application/pdf");
      await readFile(p, true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível preparar o comprovante em P&B");
    } finally {
      setBusy(false);
      setReading(false);
    }
  }

  async function submit() {
    if (reading || !verification.ok) { toast.error('O comprovante precisa ter valor correspondente e data dentro de 2 dias. Confira ou substitua o arquivo.'); return; }
    if (!paymentSourceSchema.safeParse(draft.payment_source).success) { toast.error("Informe Cartão myio ou Reembolso"); return; }
    if (draft.payment_source === "advance" && !selectedAdvance) { toast.error("Selecione o adiantamento da prestação de contas"); return; }
    if (!advanceOk) { toast.error("O valor ultrapassa o saldo do adiantamento. Envie o excedente como Reembolso"); return; }
    if (!draft.confirmed) { toast.error("Confirme todas as informações antes de salvar"); return; }
    if (draft.myio_cnpj === null) { toast.error("Confirme Com ou Sem CNPJ myio"); return; }
    if (!availableCategories.some(c => c.key === draft.category)) { toast.error("Selecione uma categoria disponível"); return; }
    const parsed = expenseSchema.safeParse(draft);
    if (!parsed.success) { toast.error(parsed.error.issues[0]?.message ?? "Confira os dados"); return; }
    const changed = categoryChangeNeedsConfirmation(suggestedCategory, draft.category);
    if (changed) {
      const nameOf = (key: string) => availableCategories.find(c => c.key === key)?.name ?? key;
      const ok = await confirmAction(categoryChangeMessage(nameOf(suggestedCategory!), nameOf(draft.category), !!draft.observation.trim()), { title: "Confirmar categoria", confirmLabel: "Confirmar categoria", cancelLabel: "Revisar" });
      if (!ok) { observationRef.current?.focus(); return; }
    }
    setBusy(true);
    try {
      await spendAction("receipt", { ...parsed.data, advance_id: draft.payment_source === "advance" ? draft.advance_id : null, suggested_category: suggestedCategory, category_change_confirmed: changed });
      if (line) await spendAction("link", { line_id: line.id, receipt_id: draft.id });
      if (recurringWarning(draft.category, draft.merchant, draft.date, data.receipts.filter(item => item.id !== draft.id))) toast.warning("IA: há outra despesa deste estabelecimento no mesmo mês");
      await onDone();
      toast.success(receipt ? "Comprovante atualizado" : "Comprovante enviado");
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar");
    } finally {
      setBusy(false);
    }
  }

  async function removeReceipt() {
    if (!receipt || busy) return;
    if (!await confirmAction(`Excluir o comprovante de ${receipt.merchant}?${linkedReceipt ? ' O lançamento da fatura será mantido e voltará a aguardar comprovante.' : ''}`, { title: receipt.payment_source === 'reimbursement' ? 'Excluir reembolso' : 'Excluir comprovante', confirmLabel: 'Excluir comprovante' })) return;
    setBusy(true);
    try {
      await deleteSpendReceipt(receipt.id);
      await onDone();
      toast.success('Comprovante excluído');
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível excluir');
    } finally { setBusy(false); }
  }

  return <Dialog open onOpenChange={open => { if (!open && !busy) onClose(); }}><DialogContent onOpenAutoFocus={event => { if (!receipt) { event.preventDefault(); picker.current?.click(); } }} className="max-h-[90dvh] max-w-xl overflow-y-auto"><DialogHeader className="pr-24"><DialogTitle>{receipt ? "Editar comprovante" : line ? "Anexar Invoice / Comprovante" : "Salvar Comprovante Fiscal"}</DialogTitle></DialogHeader>
    <input ref={picker} type="file" className="hidden" accept={line ? "image/jpeg,image/png,image/webp,application/pdf" : "image/jpeg,image/png,image/webp"} capture={line ? undefined : "environment"} onChange={event => { const file = event.target.files?.[0]; if (file) void filePicked(file); event.target.value = ""; }} />
    <div className="space-y-1"><Label>Forma de pagamento *</Label><RadioGroup aria-label="Forma de pagamento" value={draft.payment_source} disabled={busy || !!line || isDelegatedCard(card, data.user_id, data.role === "finance")} onValueChange={payment_source => change({ payment_source })} className="gap-1"><label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm"><RadioGroupItem value="myio_card" /><span>Cartão myio · •••• {card?.last_four}</span></label><label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm"><RadioGroupItem value="reimbursement" /><span>Reembolso · dinheiro ou cartão pessoal</span></label>{(openAdvances.length > 0 || draft.payment_source === "advance") && <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm"><RadioGroupItem value="advance" /><AdvanceIcon className="size-4 text-primary" /><span>Adiantamento · prestação de contas</span></label>}</RadioGroup></div>
    {draft.payment_source === "advance" && <label className="space-y-1"><Label>Adiantamento *</Label><SearchableSelect aria-label="Adiantamento da prestação de contas" value={draft.advance_id} clearable={false} onChange={advance_id => change({ advance_id })} options={openAdvances.map(a => ({ value: a.id, label: `${a.purpose || "Adiantamento"} · ${formatDate(a.paid_at)} · saldo ${BRL.format(advanceBalance(a, data.receipts.filter(r => r.id !== receipt?.id)).remaining)}` }))} placeholder="Selecionar adiantamento" />{selectedAdvance && !advanceOk && <p role="alert" className="text-xs text-destructive">Valor acima do saldo do adiantamento. Envie o excedente como Reembolso.</p>}</label>}
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3"><span className="min-w-0 truncate text-sm text-muted-foreground">{draft.payment_source === "reimbursement" ? "Reembolso" : draft.payment_source === "advance" ? "Adiantamento" : `${card?.name} · •••• ${card?.last_four}`}</span><Button className="shrink-0" onClick={() => picker.current?.click()} disabled={busy} aria-label="Fotografar ou selecionar comprovante"><Camera />{path ? "Substituir foto" : "Fotografar"}</Button></div>
    {busy && !path && !reading ? <p role="status" className="flex items-center gap-2 text-sm"><Loader2 className="size-4 animate-spin" />Preparando comprovante em P&B e removendo o fundo…</p> : null}
    {reading ? <p role="status" className="flex items-center gap-2 text-sm"><Loader2 className="size-4 animate-spin" />Conferindo o comprovante…</p> : null}
    {readError && <div role="alert" className="space-y-2 text-sm text-destructive"><p>{readError}</p><TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" aria-label="Tentar leitura do comprovante novamente" disabled={reading || busy || !path} onClick={() => void readFile(path, false)}><RefreshCw/></Button></TooltipTrigger><TooltipContent>Tentar leitura novamente</TooltipContent></Tooltip></TooltipProvider></div>}
    {analysis && !verification.ok && <div role="alert" className="space-y-1 text-sm text-destructive"><p>Comprovante divergente — salvamento bloqueado</p>{verification.amountMismatch && <p>Valor lido: {BRL.format(analysis.amount)} · {line ? 'Lançamento' : 'Valor informado'}: {BRL.format((line ?? draft).amount)}</p>}{verification.dateMismatch && <p>Data lida: {formatDate(analysis.date)} · {line ? 'Lançamento' : 'Data informada'}: {formatDate((line ?? draft).date)} · Tolerância: 2 dias</p>}</div>}
    {preview ? pdf ? <SpendReceiptPdfPreview src={preview} /> : <img src={preview} alt="Comprovante do gasto em P&B, sem o fundo" className="h-40 w-full rounded-md object-contain" /> : null}
    <div className="grid grid-cols-2 items-end gap-4"><label className="flex min-w-0 flex-col gap-1"><Label>Valor (R$)</Label><Input className="h-9" type="text" inputMode="decimal" aria-label="Valor do gasto" value={amountText} onChange={event => { const text = event.target.value; setAmountText(text); change({ amount: parseSpendAmount(text) ?? 0 }); }} onBlur={() => { const value = parseSpendAmount(amountText); if (value !== null) setAmountText(formatSpendAmount(value)); }} disabled={fixedAmountDate} /></label><label className="flex min-w-0 flex-col gap-1"><Label>Data</Label><Input className="h-9" type="date" aria-label="Data do gasto" value={draft.date} onChange={event => change({ date: event.target.value })} disabled={fixedAmountDate} /></label></div>
    <label className="space-y-1"><Label>Estabelecimento</Label><Input aria-label="Estabelecimento" value={draft.merchant} onChange={event => change({ merchant: event.target.value })} /></label>
    <div className="grid grid-cols-[minmax(0,1fr)_6rem] items-end gap-4"><div className="flex min-w-0 flex-col gap-1"><Label htmlFor={`spend-city-${draft.id}`}>Cidade</Label><SpendCityField id={`spend-city-${draft.id}`} uf={draft.uf} value={draft.city} onChange={city => change({ city })} /></div><div className="flex min-w-0 flex-col gap-1"><Label>UF</Label><SearchableSelect aria-label="UF do comprovante" value={draft.uf} options={spendStates.map(uf => ({ value: uf, label: uf }))} onChange={uf => change({ uf })} placeholder="UF" /></div></div>
    <Label>Categoria informada</Label>
    <div role="group" aria-label="Categoria da despesa" className="grid grid-cols-2 gap-2">{availableCategories.map(category => { const Icon = categoryIcons[category.icon] ?? categoryIcons["Ellipsis"]; return <Button key={category.key} variant={draft.category === category.key ? "secondary" : "outline"} className="min-h-11 whitespace-normal text-left" aria-pressed={draft.category === category.key} onClick={() => change({ category: category.key })}>{Icon ? <Icon /> : null}<span className="min-w-0 flex-1 text-xs">{category.name}</span>{draft.category === category.key ? <Check /> : null}</Button>; })}</div>
    {path ? <div className="space-y-2"><Label>CNPJ da myio no comprovante</Label><RadioGroup aria-label="CNPJ da myio no comprovante" value={draft.myio_cnpj === null ? "" : draft.myio_cnpj ? "com" : "sem"} onValueChange={value => change({ myio_cnpj: value === "com" })} className="flex flex-wrap gap-4">{[["com", "Com CNPJ myio"], ["sem", "Sem CNPJ myio"]].map(([value, label]) => <label key={value} className="flex items-center gap-2 text-sm"><RadioGroupItem value={value ?? ""} /><span>{label}</span></label>)}</RadioGroup><p className="text-xs text-muted-foreground">A leitura sugere esta marcação; confirme antes de salvar.</p></div> : null}
    <label className="space-y-1"><Label>Projeto {draft.category === "insumos" ? "*" : "(opcional)"}</Label><SearchableSelect aria-label="Projeto do gasto" value={draft.project_id ?? ""} onChange={project_id => change({ project_id: project_id || null })} options={data.projects.map(project => ({ value: project.id, label: project.name }))} placeholder="Selecionar Projeto" /></label>
    <label className="space-y-1"><Label>{draft.category === "outros" ? "Especifique a despesa *" : `Observação ${draft.category === "servicos" ? "*" : "(opcional)"}`}</Label><Textarea ref={observationRef} aria-label="Observação do gasto" value={draft.observation} onChange={event => change({ observation: event.target.value })} /></label>
    {draft.category === "ferramentas" ? <div className="flex min-h-11 items-center gap-2 text-sm"><Checkbox id={`spend-photo-${draft.id}`} checked={draft.clear_photo} onCheckedChange={value => change({ clear_photo: value === true })} /><Label htmlFor={`spend-photo-${draft.id}`} className="flex min-h-11 flex-1 cursor-pointer items-center font-normal">A foto da NF/cupom está nítida</Label></div> : null}
    {draft.category === "ia" || draft.category === "software" ? <p className="text-xs text-muted-foreground">Recorrência mensal</p> : null}
    {path ? <div className="flex min-h-11 items-center gap-2 text-sm"><Checkbox id={`spend-confirm-${draft.id}`} aria-label="Conferi e confirmo as informações do comprovante" disabled={busy} checked={draft.confirmed} onCheckedChange={value => setDraft(current => ({ ...current, confirmed: value === true }))} /><Label htmlFor={`spend-confirm-${draft.id}`} className="flex min-h-11 flex-1 cursor-pointer items-center py-2 font-normal">Conferi e confirmo forma de pagamento, valor, data, estabelecimento, categoria, CNPJ e demais informações.</Label></div> : null}
    <div className="flex w-full items-center justify-end gap-2">{receipt && canDeleteSpendReceipt(receipt,data.user_id,data.lines.some(item => item.receipt_id === receipt.id && (item.status === 'approved' || !!item.payable_id))) && <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" aria-label={receipt.payment_source === 'reimbursement' ? 'Excluir reembolso' : 'Excluir comprovante'} disabled={busy} onClick={() => void removeReceipt()}><Trash2 /></Button></TooltipTrigger><TooltipContent>{receipt.payment_source === 'reimbursement' ? 'Excluir reembolso' : 'Excluir comprovante'}</TooltipContent></Tooltip></TooltipProvider>}<Button variant="ghost" size="icon" title="Salvar Comprovante Fiscal" aria-label="Salvar Comprovante Fiscal" onClick={submit} disabled={busy || reading || !verification.ok || !path || !draft.confirmed || draft.myio_cnpj === null || !paymentSourceSchema.safeParse(draft.payment_source).success || !advanceOk}><Save /></Button></div>
  </DialogContent></Dialog>;
}
