import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Camera, Check, Loader2, Save } from "lucide-react";
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
import { spendAction, spendFileUrl, uploadSpend, type SpendData, type Line, type Receipt } from "./data";
import { formatSpendAmount, parseSpendAmount } from "./amount";
import { prepareSpendReceipt } from "./receipt-image";
import { spendFiscalLocation, spendStates } from "./fiscal-location";
import { SpendCityField } from "./city-field";

const today = () => new Date().toLocaleDateString("en-CA");

export function SpendCapture({ data, cardId, line, receipt, onDone, onClose }: { data: SpendData; cardId: string; line?: Line; receipt?: Receipt; onDone: () => Promise<void>; onClose: () => void }) {
  const card = data.cards.find(c => c.id === cardId);
  const extract = useServerFn(extractSpendDocument);
  const availableCategories = configuredCategories(data.settings);
  const picker = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [reading, setReading] = useState(false);
  const linkedReceipt = !!receipt && data.lines.some(item => item.receipt_id === receipt.id);
  const fixedAmountDate = !!line || linkedReceipt;
  const [path, setPath] = useState(receipt?.file_path ?? "");
  const [preview, setPreview] = useState("");
  const [pdf, setPdf] = useState(receipt?.file_path.toLowerCase().endsWith(".pdf") ?? false);
  const [amountText, setAmountText] = useState(receipt ? formatSpendAmount(receipt.amount) : line?.amount ? formatSpendAmount(line.amount) : "");
  const [draft, setDraft] = useState({ id: receipt?.id ?? crypto.randomUUID(), card_id: cardId, date: receipt?.date ?? line?.date ?? today(), merchant: receipt?.merchant ?? line?.merchant ?? "", amount: receipt?.amount ?? line?.amount ?? 0, category: receipt?.category ?? availableCategories[0]?.key ?? "", observation: receipt?.observation ?? "", project_id: receipt?.project_id ?? null as string | null, file_path: receipt?.file_path ?? "", clear_photo: receipt?.clear_photo ?? false, myio_cnpj: receipt?.myio_cnpj ?? null as boolean | null, city: receipt?.city ?? "", uf: receipt?.uf ?? "", access_key: receipt?.access_key ?? null as string | null, confirmed: false });

  useEffect(() => {
    if (!receipt) return;
    let active = true;
    void spendFileUrl(receipt.file_path).then(url => { if (active) setPreview(url); }).catch(() => { if (active) toast.error("Não foi possível abrir a foto atual"); });
    return () => { active = false; };
  }, [receipt?.id, receipt?.file_path]);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  function change(patch: Partial<typeof draft>) {
    setDraft(current => ({ ...current, ...patch, confirmed: false }));
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
      setReading(true);
      try {
        const result = await extract({ data: { path: p, kind: "receipt" } });
        const item = result.lancamentos[0];
        if (item) {
          const category = item.categoria_sugerida && availableCategories.some(c => c.key === item.categoria_sugerida) ? item.categoria_sugerida : null;
          setDraft(d => ({ ...d, ...spendFiscalLocation(item), date: fixedAmountDate ? d.date : item.data, merchant: line ? d.merchant : item.estabelecimento, amount: fixedAmountDate ? d.amount : item.valor, category: category ?? d.category, myio_cnpj: item.myio_cnpj, confirmed: false }));
          if (!fixedAmountDate) setAmountText(formatSpendAmount(item.valor));
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Confira os dados manualmente");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível preparar o comprovante em P&B");
    } finally {
      setBusy(false);
      setReading(false);
    }
  }

  async function submit() {
    if (!draft.confirmed) { toast.error("Confirme todas as informações antes de salvar"); return; }
    if (draft.myio_cnpj === null) { toast.error("Confirme Com ou Sem CNPJ myio"); return; }
    if (!availableCategories.some(c => c.key === draft.category)) { toast.error("Selecione uma categoria disponível"); return; }
    const parsed = expenseSchema.safeParse(draft);
    if (!parsed.success) { toast.error(parsed.error.issues[0]?.message ?? "Confira os dados"); return; }
    setBusy(true);
    try {
      await spendAction("receipt", parsed.data);
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

  return <Dialog open onOpenChange={open => { if (!open && !busy) onClose(); }}><DialogContent onOpenAutoFocus={event => { if (!receipt) { event.preventDefault(); picker.current?.click(); } }} className="max-h-[90dvh] max-w-xl overflow-y-auto"><DialogHeader className="pr-24"><DialogTitle>{receipt ? "Editar comprovante" : line ? "Anexar Invoice / Comprovante" : "Salvar Comprovante Fiscal"}</DialogTitle></DialogHeader>
    <input ref={picker} type="file" className="hidden" accept={line ? "image/jpeg,image/png,image/webp,application/pdf" : "image/jpeg,image/png,image/webp"} capture={line ? undefined : "environment"} onChange={event => { const file = event.target.files?.[0]; if (file) void filePicked(file); event.target.value = ""; }} />
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3"><span className="min-w-0 truncate text-sm text-muted-foreground">{card?.name} · •••• {card?.last_four}</span><Button className="shrink-0" onClick={() => picker.current?.click()} disabled={busy} aria-label="Fotografar ou selecionar comprovante"><Camera />{path ? "Substituir foto" : "Fotografar"}</Button></div>
    {busy && !path && !reading ? <p role="status" className="flex items-center gap-2 text-sm"><Loader2 className="size-4 animate-spin" />Preparando comprovante em P&B e removendo o fundo…</p> : null}
    {reading ? <p role="status" className="flex items-center gap-2 text-sm"><Loader2 className="size-4 animate-spin" />Lendo valor, categoria e CNPJ…</p> : null}
    {preview && !pdf ? <img src={preview} alt="Comprovante do gasto em P&B, sem o fundo" className="h-40 w-full rounded-md object-contain" /> : pdf ? <p className="text-sm">Invoice PDF anexada</p> : null}
    <div className="grid grid-cols-2 items-end gap-4"><label className="flex min-w-0 flex-col gap-1"><Label>Valor (R$)</Label><Input className="h-9" type="text" inputMode="decimal" aria-label="Valor do gasto" value={amountText} onChange={event => { const text = event.target.value; setAmountText(text); change({ amount: parseSpendAmount(text) ?? 0 }); }} onBlur={() => { const value = parseSpendAmount(amountText); if (value !== null) setAmountText(formatSpendAmount(value)); }} disabled={fixedAmountDate} /></label><label className="flex min-w-0 flex-col gap-1"><Label>Data</Label><Input className="h-9" type="date" aria-label="Data do gasto" value={draft.date} onChange={event => change({ date: event.target.value })} disabled={fixedAmountDate} /></label></div>
    <label className="space-y-1"><Label>Estabelecimento</Label><Input aria-label="Estabelecimento" value={draft.merchant} onChange={event => change({ merchant: event.target.value })} /></label>
    <div className="grid grid-cols-[minmax(0,1fr)_6rem] items-end gap-4"><div className="min-w-0 space-y-1"><Label htmlFor={`spend-city-${draft.id}`}>Cidade</Label><SpendCityField id={`spend-city-${draft.id}`} uf={draft.uf} value={draft.city} onChange={city => change({ city })} /></div><div className="min-w-0 space-y-1"><Label>UF</Label><SearchableSelect aria-label="UF do comprovante" value={draft.uf} options={spendStates.map(uf => ({ value: uf, label: uf }))} onChange={uf => change({ uf })} placeholder="UF" /></div></div>
    <div role="group" aria-label="Categoria da despesa" className="grid grid-cols-2 gap-2">{availableCategories.map(category => { const Icon = categoryIcons[category.icon] ?? categoryIcons["Ellipsis"]; return <Button key={category.key} variant={draft.category === category.key ? "secondary" : "outline"} className="min-h-11 whitespace-normal text-left" aria-pressed={draft.category === category.key} onClick={() => change({ category: category.key })}>{Icon ? <Icon /> : null}<span className="min-w-0 flex-1 text-xs">{category.name}</span>{draft.category === category.key ? <Check /> : null}</Button>; })}</div>
    {path ? <div className="space-y-2"><Label>CNPJ da myio no comprovante</Label><RadioGroup aria-label="CNPJ da myio no comprovante" value={draft.myio_cnpj === null ? "" : draft.myio_cnpj ? "com" : "sem"} onValueChange={value => change({ myio_cnpj: value === "com" })} className="flex flex-wrap gap-4">{[["com", "Com CNPJ myio"], ["sem", "Sem CNPJ myio"]].map(([value, label]) => <label key={value} className="flex items-center gap-2 text-sm"><RadioGroupItem value={value ?? ""} /><span>{label}</span></label>)}</RadioGroup><p className="text-xs text-muted-foreground">A leitura sugere esta marcação; confirme antes de salvar.</p></div> : null}
    <label className="space-y-1"><Label>Projeto {draft.category === "insumos" ? "*" : "(opcional)"}</Label><SearchableSelect aria-label="Projeto do gasto" value={draft.project_id ?? ""} onChange={project_id => change({ project_id: project_id || null })} options={data.projects.map(project => ({ value: project.id, label: project.name }))} placeholder="Selecionar Projeto" /></label>
    <label className="space-y-1"><Label>{draft.category === "outros" ? "Especifique a despesa *" : `Observação ${draft.category === "servicos" ? "*" : "(opcional)"}`}</Label><Textarea aria-label="Observação do gasto" value={draft.observation} onChange={event => change({ observation: event.target.value })} /></label>
    {draft.category === "ferramentas" ? <div className="flex min-h-11 items-center gap-2 text-sm"><Checkbox id={`spend-photo-${draft.id}`} checked={draft.clear_photo} onCheckedChange={value => change({ clear_photo: value === true })} /><Label htmlFor={`spend-photo-${draft.id}`} className="flex min-h-11 flex-1 cursor-pointer items-center font-normal">A foto da NF/cupom está nítida</Label></div> : null}
    {draft.category === "ia" || draft.category === "software" ? <p className="text-xs text-muted-foreground">Recorrência mensal</p> : null}
    {path ? <div className="flex min-h-11 items-center gap-2 text-sm"><Checkbox id={`spend-confirm-${draft.id}`} aria-label="Conferi e confirmo as informações do comprovante" disabled={busy} checked={draft.confirmed} onCheckedChange={value => setDraft(current => ({ ...current, confirmed: value === true }))} /><Label htmlFor={`spend-confirm-${draft.id}`} className="flex min-h-11 flex-1 cursor-pointer items-center py-2 font-normal">Conferi e confirmo valor, data, estabelecimento, categoria, CNPJ e demais informações.</Label></div> : null}
    <div className="flex w-full justify-end"><Button className="ml-auto" variant="ghost" size="icon" title="Salvar Comprovante Fiscal" aria-label="Salvar Comprovante Fiscal" onClick={submit} disabled={busy || !path || !draft.confirmed || draft.myio_cnpj === null}><Save /></Button></div>
  </DialogContent></Dialog>;
}
