import { useRef, useState } from "react";
import { Download, History, LoaderCircle, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { applyCustomerAnswer, appendClientObservation, type ClientReportItem } from "@/lib/site-survey-customer-answer-import";
import { readClientReport } from "@/lib/site-survey-client-report-reader";
import { customerQuestions } from "@/lib/site-survey-questions";
import { surveyPointType } from "@/lib/site-survey-point-type";

type HistoryRow = { id: string; file_name: string; storage_path: string; created_at: string };
export function SiteSurveyClientAnswerImport({ visitId, onImported, canImport = true }: { visitId: string; onImported: () => void | Promise<void>; canImport?: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [items, setItems] = useState<ClientReportItem[] | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [unresolved, setUnresolved] = useState<string[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [history, setHistory] = useState<HistoryRow[] | null>(null);
  const readFile = async (pdf: File) => {
    setBusy(true);
    try {
      const [lucs, environments] = await Promise.all([
        supabase.from("site_survey_visit_lucs").select("id,shop_name,luc_number,location,point_type,classification_type").eq("visit_id", visitId).eq("active", true),
        supabase.from("site_survey_visit_environments").select("id,name,luc_number,location,point_type").eq("visit_id", visitId).eq("active", true),
      ]);
      if (lucs.error || environments.error) throw lucs.error ?? environments.error;
      const points = [...(lucs.data ?? []).map((p) => ({ value: `luc:${p.id}`, label: [p.luc_number, p.shop_name].filter(Boolean).join(" — "), name: p.shop_name, lucNumber: p.luc_number, location: p.location, pointType: surveyPointType(p) })), ...(environments.data ?? []).map((p) => ({ value: `environment:${p.id}`, label: p.name, name: p.name, lucNumber: p.luc_number, location: p.location }))];
      const result = await readClientReport(pdf, visitId, points);
      if (!result.items.length && !result.unresolved.length) throw new Error("Nenhuma resposta, confirmação ou observação preenchida foi encontrada.");
      setItems(result.items); setUnresolved(result.unresolved); setFile(pdf);
      setSelected(new Set(result.items.map((item) => item.field)));
    } catch (e) { toast.error(e instanceof Error ? e.message : "Não foi possível ler o PDF."); }
    finally { setBusy(false); if (input.current) input.current.value = ""; }
  };
  const confirm = async () => {
    if (!items || !file) return;
    setBusy(true);
    const path = `${visitId}/client-reports/${crypto.randomUUID()}.pdf`;
    let uploaded = false, persisted = false;
    try {
      const chosen = items.filter((item) => selected.has(item.field));
      const rows = [];
      for (let from = 0; ; from += 1000) {
        const result = await supabase.from("site_survey_responses").select("id,question_id,visit_luc_id,visit_environment_id,answer").eq("visit_id", visitId).order("id").range(from, from + 999);
        if (result.error) throw result.error;
        rows.push(...(result.data ?? []));
        if ((result.data?.length ?? 0) < 1000) break;
      }
      const [questions, sections, visit, lucs, environments] = await Promise.all([
        supabase.from("site_survey_questions").select("id,section_id,prompt,question_key,active"),
        supabase.from("site_survey_sections").select("id,template_id,active"),
        supabase.from("site_survey_visits").select("template_id").eq("id", visitId).single(),
        supabase.from("site_survey_visit_lucs").select("id,template_id").eq("visit_id", visitId),
        supabase.from("site_survey_visit_environments").select("id,template_id").eq("visit_id", visitId),
      ]);
      const error = questions.error ?? sections.error ?? visit.error ?? lucs.error ?? environments.error;
      if (error) throw error;
      const finals = (questions.data ?? []).filter((q) => q.question_key === "shopping_final_notes" || q.prompt.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().includes("observacoes finais da visita"));
      type Edit = { id?: string; expected?: unknown; questionId?: string; lucId?: string | null; environmentId?: string | null; answer: unknown };
      const edits = new Map<string, Edit>();
      for (const item of chosen) {
        if (item.kind === "confirmation") continue;
        const [kind, id] = item.point.split(":");
        const scoped = rows.filter((r) => item.point === (r.visit_luc_id ? `luc:${r.visit_luc_id}` : r.visit_environment_id ? `environment:${r.visit_environment_id}` : "general"));
        let row = item.kind === "observation" ? scoped.find((r) => finals.some((q) => q.id === r.question_id)) : scoped.find((r) => customerQuestions(r.answer).includes(item.question));
        let questionId = row?.question_id;
        if (item.kind === "observation" && !questionId) {
          const template = (kind === "luc" ? lucs.data?.find((p) => p.id === id)?.template_id : environments.data?.find((p) => p.id === id)?.template_id) ?? visit.data?.template_id;
          questionId = finals.find((q) => q.active && sections.data?.some((s) => s.id === q.section_id && s.active && s.template_id === template))?.id;
        }
        if (!questionId) throw new Error(`Não foi encontrado o campo do checklist para ${item.label}. Nenhuma alteração foi gravada.`);
        const key = `${item.point}:${questionId}`;
        const previous = edits.get(key);
        const answer = item.kind === "observation" ? appendClientObservation(previous?.answer ?? row?.answer, item.answer) : applyCustomerAnswer(previous?.answer ?? row?.answer, item.question, item.answer);
        edits.set(key, row ? { id: row.id, expected: row.answer, answer } : { questionId, lucId: kind === "luc" ? id ?? null : null, environmentId: kind === "environment" ? id ?? null : null, answer });
      }
      const upload = await supabase.storage.from("site-survey-attachments").upload(path, file, { contentType: "application/pdf", upsert: false });
      if (upload.error) throw upload.error;
      uploaded = true;
      const result = await supabase.rpc("import_survey_client_report", { _visit_id: visitId, _file_name: file.name, _storage_path: path, _items: chosen as never, _edits: [...edits.values()] as never });
      if (result.error) throw result.error;
      persisted = true;
      setItems(null); setFile(null);
      await onImported();
      window.dispatchEvent(new CustomEvent("survey-client-report-imported", { detail: visitId }));
      toast.success(`${chosen.length} informação(ões) importada(s). PDF salvo no histórico.`);
    } catch (e) {
      if (uploaded && !persisted) await supabase.storage.from("site-survey-attachments").remove([path]);
      toast.error(e instanceof Error ? e.message : "Não foi possível importar. Nenhuma alteração foi gravada.");
    } finally { setBusy(false); }
  };
  const openHistory = async () => {
    const result = await supabase.from("site_survey_client_report_imports").select("id,file_name,storage_path,created_at").eq("visit_id", visitId).order("created_at", { ascending: false });
    if (result.error) return toast.error(result.error.message);
    setHistory(result.data ?? []);
  };
  const download = async (row: HistoryRow) => {
    const result = await supabase.storage.from("site-survey-attachments").download(row.storage_path);
    if (result.error) return toast.error(result.error.message);
    const url = URL.createObjectURL(result.data), a = document.createElement("a"); a.href = url; a.download = row.file_name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 30000);
  };
  return <>
    <input ref={input} type="file" accept="application/pdf" className="hidden" onChange={(e) => { const pdf = e.target.files?.[0]; if (pdf) void readFile(pdf); }} />
    {canImport ? <Button type="button" size="sm" variant="action" aria-label="Importar respostas do cliente" title="Importar respostas do cliente" disabled={busy} onClick={() => input.current?.click()}>{busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}<span className="hidden xl:inline">Importar respostas do cliente</span></Button> : null}
    <Button type="button" size="sm" variant="action" aria-label="Histórico dos relatórios" title="Histórico dos relatórios" onClick={() => void openHistory()}><History className="h-4 w-4" /><span className="hidden xl:inline">Histórico dos relatórios</span></Button>
    <Dialog open={Boolean(items)} onOpenChange={(open) => { if (!open && !busy) { setItems(null); setFile(null); } }}><DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto"><DialogHeader><DialogTitle>Confirmar baixa das pendências</DialogTitle><DialogDescription>Respostas, confirmações e observações do cliente</DialogDescription></DialogHeader>
      {unresolved.length ? <p role="alert" className="text-sm text-destructive">{unresolved.length} campo(s) sem identificação segura do ponto ({unresolved.join(", ")}). Estes campos não serão importados; o PDF completo ficará no histórico.</p> : null}
      <div className="space-y-3">{items?.map((item) => <label key={item.field} className="flex cursor-pointer gap-3"><Checkbox className="mt-0.5" checked={selected.has(item.field)} onCheckedChange={(checked) => setSelected((current) => { const next = new Set(current); if (checked === true) next.add(item.field); else next.delete(item.field); return next; })} /><span className="min-w-0 space-y-1 text-sm"><span className="block text-muted-foreground">{item.label}</span><span className="block">{item.question}</span><span className="block whitespace-pre-wrap break-words">{item.answer}</span></span></label>)}</div>
      <DialogFooter><Button type="button" variant="action" disabled={busy || !selected.size} onClick={() => void confirm()}>{busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}Confirmar importação ({selected.size})</Button></DialogFooter>
    </DialogContent></Dialog>
    <Dialog open={history !== null} onOpenChange={(open) => { if (!open) setHistory(null); }}><DialogContent className="max-h-[85vh] overflow-y-auto"><DialogHeader><DialogTitle>Histórico dos relatórios</DialogTitle><DialogDescription>PDFs com as respostas do cliente</DialogDescription></DialogHeader>{history?.length ? history.map((row) => <div key={row.id} className="flex items-center justify-between gap-3"><div className="min-w-0"><p className="break-words text-sm">{row.file_name}</p><p className="text-xs text-muted-foreground">{new Date(row.created_at).toLocaleString("pt-BR")}</p></div><Button type="button" variant="ghost" size="compactIcon" aria-label={`Baixar ${row.file_name}`} title="Baixar PDF respondido" onClick={() => void download(row)}><Download className="h-4 w-4" /></Button></div>) : <p className="text-sm text-muted-foreground">Nenhum PDF respondido importado.</p>}</DialogContent></Dialog>
  </>;
}
