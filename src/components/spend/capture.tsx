import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Camera, Check, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { extractSpendDocument } from "@/lib/spend.functions";
import { configuredCategories, expenseSchema, recurringWarning } from "./rules";
import { categoryIcons } from "./icons";
import { spendAction, uploadSpend, type SpendData, type Line } from "./data";
const today = () => new Date().toLocaleDateString("en-CA");
export function SpendCapture({ data, cardId, line, onDone, onClose }: { data: SpendData; cardId: string; line?: Line; onDone: () => Promise<void>; onClose: () => void }) {
  const card = data.cards.find(c => c.id === cardId); const extract = useServerFn(extractSpendDocument);
  const availableCategories = configuredCategories(data.settings);
  const picker = useRef<HTMLInputElement>(null); const [busy, setBusy] = useState(false); const [reading, setReading] = useState(false);
  const [path, setPath] = useState(""); const [preview, setPreview] = useState(""); const [pdf, setPdf] = useState(false);
  const [draft, setDraft] = useState({ id: crypto.randomUUID(), card_id: cardId, date: line?.date ?? today(), merchant: line?.merchant ?? "", amount: line?.amount ?? 0, category: availableCategories[0]?.key ?? "", observation: "", project_id: null as string | null, file_path: "", clear_photo: false });
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  async function filePicked(file: File) {
    if (!card) return; setBusy(true);
    try {
      const p = await uploadSpend(file, card, draft.date.slice(0, 7)); setPath(p); setDraft(d => ({ ...d, file_path: p })); setPreview(URL.createObjectURL(file)); setPdf(file.type === "application/pdf"); setReading(true);
      try { const r = await extract({ data: { path: p, kind: "receipt" } }); const item = r.lancamentos[0]; if (item && !line) setDraft(d => ({ ...d, date: item.data, merchant: item.estabelecimento, amount: item.valor })); }
      catch (e) { toast.error(e instanceof Error ? e.message : "Confira os dados manualmente"); }
    } catch (e) { toast.error(e instanceof Error ? e.message : "Não foi possível enviar"); }
    finally { setBusy(false); setReading(false); }
  }
  async function submit() {
    if (!availableCategories.some(c => c.key === draft.category)) { toast.error("Selecione uma categoria disponível"); return; }
    const parsed = expenseSchema.safeParse(draft); if (!parsed.success) { toast.error(parsed.error.issues[0]?.message ?? "Confira os dados"); return; }
    setBusy(true); try { await spendAction("receipt", parsed.data); if (line) await spendAction("link", { line_id: line.id, receipt_id: draft.id });
      if (recurringWarning(draft.category, draft.merchant, draft.date, data.receipts)) toast.warning("IA: há outra despesa deste estabelecimento no mesmo mês");
      await onDone(); toast.success("Comprovante enviado"); onClose();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Não foi possível salvar"); } finally { setBusy(false); }
  }
  return <Dialog open onOpenChange={o => { if (!o && !busy) onClose(); }}><DialogContent onOpenAutoFocus={e => { e.preventDefault(); picker.current?.click(); }} className="max-h-[90dvh] max-w-xl overflow-y-auto"><DialogHeader><DialogTitle>{line ? "Anexar Invoice / Comprovante" : "Registrar gasto"}</DialogTitle></DialogHeader>
    <input ref={picker} type="file" className="hidden" accept={line ? "image/jpeg,image/png,image/webp,application/pdf" : "image/jpeg,image/png,image/webp"} capture={line ? undefined : "environment"} onChange={e => { const f = e.target.files?.[0]; if (f) void filePicked(f); e.target.value = ""; }} />
    <div className="flex items-center justify-between gap-3"><span className="truncate text-sm text-muted-foreground">{card?.name} · •••• {card?.last_four}</span><Button onClick={() => picker.current?.click()} disabled={busy} aria-label="Fotografar ou selecionar comprovante"><Camera />{path ? "Substituir foto" : "Fotografar"}</Button></div>
    {reading ? <p role="status" className="flex items-center gap-2 text-sm"><Loader2 className="size-4 animate-spin" />Lendo valor e data…</p> : null}
    {preview && !pdf ? <img src={preview} alt="Comprovante do gasto" className="h-40 w-full rounded-md object-contain" /> : pdf ? <p className="text-sm">Invoice PDF anexada</p> : null}
    <div className="grid grid-cols-2 gap-4"><label className="space-y-1"><Label>Valor (R$)</Label><Input type="number" aria-label="Valor do gasto" min="0.01" step="0.01" value={draft.amount || ""} onChange={e => setDraft({ ...draft, amount: Number(e.target.value) })} disabled={!!line} /></label><label className="space-y-1"><Label>Data</Label><Input type="date" aria-label="Data do gasto" value={draft.date} onChange={e => setDraft({ ...draft, date: e.target.value })} disabled={!!line} /></label></div>
    <label className="space-y-1"><Label>Estabelecimento</Label><Input aria-label="Estabelecimento" value={draft.merchant} onChange={e => setDraft({ ...draft, merchant: e.target.value })} /></label>
    <div role="group" aria-label="Categoria da despesa" className="grid grid-cols-2 gap-2">{availableCategories.map(c => { const Icon = categoryIcons[c.icon] ?? categoryIcons["Ellipsis"]; return <Button key={c.key} variant={draft.category === c.key ? "secondary" : "outline"} className="min-h-11 whitespace-normal text-left" aria-pressed={draft.category === c.key} onClick={() => setDraft({ ...draft, category: c.key })}>{Icon ? <Icon /> : null}<span className="min-w-0 flex-1 text-xs">{c.name}</span>{draft.category === c.key ? <Check /> : null}</Button>; })}</div>
    <label className="space-y-1"><Label>Projeto {draft.category === "insumos" ? "*" : "(opcional)"}</Label><SearchableSelect aria-label="Projeto do gasto" value={draft.project_id ?? ""} onChange={project_id => setDraft({ ...draft, project_id: project_id || null })} options={data.projects.map(p => ({ value: p.id, label: p.name }))} placeholder="Selecionar Projeto" /></label>
    <label className="space-y-1"><Label>{draft.category === "outros" ? "Especifique a despesa *" : `Observação ${draft.category === "servicos" ? "*" : "(opcional)"}`}</Label><Textarea aria-label="Observação do gasto" value={draft.observation} onChange={e => setDraft({ ...draft, observation: e.target.value })} /></label>
    {draft.category === "ferramentas" && <label className="flex items-center gap-2 text-sm"><Checkbox checked={draft.clear_photo} onCheckedChange={v => setDraft({ ...draft, clear_photo: v === true })} />A foto da NF/cupom está nítida</label>}
    {draft.category === "ia" || draft.category === "software" ? <p className="text-xs text-muted-foreground">Recorrência mensal</p> : null}
    <Button variant="ghost" size="icon" title="Enviar comprovante" aria-label="Enviar comprovante" onClick={submit} disabled={busy || !path}><Save /></Button>
  </DialogContent></Dialog>;
}