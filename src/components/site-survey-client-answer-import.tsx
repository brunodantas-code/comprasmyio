import { useRef, useState } from "react";
import { LoaderCircle, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { applyCustomerAnswer, decodeCustomerAnswerMap, type CustomerAnswerField } from "@/lib/site-survey-customer-answer-import";
import { customerQuestions, pendingCustomerQuestions } from "@/lib/site-survey-questions";

type Item = CustomerAnswerField & { answer: string; responseId: string; alreadyAnswered: boolean };

export function SiteSurveyClientAnswerImport({ visitId, onImported }: { visitId: string; onImported: () => void | Promise<void> }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [items, setItems] = useState<Item[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const readFile = async (file: File) => {
    setBusy(true);
    try {
      const { PDFDocument, PDFTextField } = await import("pdf-lib");
      const doc = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
      const map = decodeCustomerAnswerMap(doc.getSubject());
      if (!map) throw new Error("Este PDF não é um relatório de pendências para o cliente gerado pelo sistema.");
      if (map.visit !== visitId) throw new Error("Este PDF pertence a outra visita.");
      const form = doc.getForm();
      const answers = new Map<string, string>();
      for (const field of form.getFields()) {
        if (field instanceof PDFTextField) { const text = field.getText()?.trim(); if (text) answers.set(field.getName(), text); }
      }
      const { data, error } = await supabase.from("site_survey_responses").select("id,visit_luc_id,visit_environment_id,answer").eq("visit_id", visitId);
      if (error) throw new Error(error.message);
      const found: Item[] = [];
      for (const field of map.fields) {
        const answer = answers.get(field.field);
        if (!answer) continue;
        const response = (data ?? []).find((row) => {
          const key = row.visit_luc_id ? `luc:${row.visit_luc_id}` : row.visit_environment_id ? `environment:${row.visit_environment_id}` : "general";
          return key === field.point && customerQuestions(row.answer).includes(field.question);
        });
        if (!response) continue;
        found.push({ ...field, answer, responseId: response.id, alreadyAnswered: !pendingCustomerQuestions(response.answer).includes(field.question) });
      }
      if (!found.length) throw new Error("Nenhuma resposta preenchida foi encontrada no PDF.");
      setItems(found);
      setSelected(new Set(found.filter((item) => !item.alreadyAnswered).map((item) => item.field)));
    } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível ler o PDF."); }
    finally { setBusy(false); if (input.current) input.current.value = ""; }
  };

  const confirm = async () => {
    if (!items) return;
    setBusy(true);
    try {
      const chosen = items.filter((item) => selected.has(item.field));
      const byResponse = new Map<string, Item[]>();
      for (const item of chosen) byResponse.set(item.responseId, [...(byResponse.get(item.responseId) ?? []), item]);
      const { data: userData } = await supabase.auth.getUser();
      for (const [id, group] of byResponse) {
        const { data, error } = await supabase.from("site_survey_responses").select("answer").eq("id", id).single();
        if (error) throw new Error(error.message);
        let answer: unknown = data.answer;
        for (const item of group) answer = applyCustomerAnswer(answer, item.question, item.answer);
        const result = await supabase.from("site_survey_responses").update({ answer: answer as never, answered_by: userData.user?.id }).eq("id", id);
        if (result.error) throw new Error(result.error.message);
      }
      toast.success(`${chosen.length} resposta(s) importada(s) e pendência(s) baixada(s).`);
      setItems(null);
      await onImported();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível importar as respostas."); }
    finally { setBusy(false); }
  };

  return <>
    <input ref={input} type="file" accept="application/pdf" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void readFile(file); }} />
    <Button type="button" size="sm" variant="action" disabled={busy} onClick={() => input.current?.click()}>{busy && !items ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}Importar respostas do cliente</Button>
    <Dialog open={Boolean(items)} onOpenChange={(open) => { if (!open && !busy) setItems(null); }}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Confirmar baixa das pendências</DialogTitle>
          <DialogDescription>Confira as respostas do cliente. As marcadas serão gravadas no checklist e a pergunta receberá baixa.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {items?.map((item) => <label key={item.field} className="flex cursor-pointer gap-3 rounded-md border p-3">
            <Checkbox className="mt-0.5" checked={selected.has(item.field)} onCheckedChange={(checked) => setSelected((current) => { const next = new Set(current); if (checked === true) next.add(item.field); else next.delete(item.field); return next; })} />
            <span className="min-w-0 space-y-1 text-sm">
              <span className="block text-xs text-muted-foreground">{item.label}{item.alreadyAnswered ? " · já respondida" : ""}</span>
              <span className="block rounded bg-muted px-2 py-1">{item.question}</span>
              <span className="block break-words rounded bg-myio-green/10 px-2 py-1">{item.answer}</span>
            </span>
          </label>)}
        </div>
        <DialogFooter>
          <Button type="button" variant="action" disabled={busy} onClick={() => setItems(null)}>Cancelar</Button>
          <Button type="button" variant="action" disabled={busy || !selected.size} onClick={() => void confirm()}>{busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}Confirmar baixa ({selected.size})</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </>;
}
