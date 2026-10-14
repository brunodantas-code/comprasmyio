import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { customerQuestionResponses, customerQuestions } from "@/lib/site-survey-questions";

export function SiteSurveyCustomerQuestions({ questionId, answer, onChange }: { questionId: string; answer: unknown; onChange?: (value: string) => void }) {
  const initialResponses = customerQuestionResponses(answer);
  const [rows, setRows] = useState(() => {
    const existing = customerQuestions(answer);
    return existing.length ? existing : [""];
  });
  const removeRow = (index: number) => {
    const next = rows.filter((_, position) => position !== index);
    setRows(next);
    onChange?.(next.map((value) => value.trim()).filter(Boolean).join("\n"));
  };
  return <div className="w-full min-w-0 space-y-3">
    <input type="hidden" name={questionId} value={rows.map((row) => row.trim()).filter(Boolean).join("\n")} />
    {rows.map((row, index) => <div key={index} className="min-w-0 space-y-2">
      <Label htmlFor={`${questionId}-customer-${index}`}>Pergunta {index + 1}</Label>
      <div className="flex items-start gap-2">
        <Textarea id={`${questionId}-customer-${index}`} name={`${questionId}__customer_question`} value={row} rows={2} onChange={(event) => {
          const next = rows.map((value, position) => position === index ? event.target.value : value);
          setRows(next);
          onChange?.(next.map((value) => value.trim()).filter(Boolean).join("\n"));
        }} />
        {rows.length > 1 ? <ConfirmDeleteButton
          title="Excluir pergunta?"
          description="A pergunta digitada será removida deste ponto."
          confirmLabel="Excluir"
          ariaLabel={`Excluir pergunta ${index + 1}`}
          onConfirm={() => removeRow(index)}
        /> : null}
      </div>
      <div className="space-y-1">
        <Label htmlFor={`${questionId}-customer-response-${index}`}>Resposta do cliente</Label>
        <Textarea id={`${questionId}-customer-response-${index}`} name={`${questionId}__customer_response`} defaultValue={initialResponses[row] ?? ""} rows={2} className="bg-action/30 focus-visible:bg-action/40" />
      </div>
    </div>)}
    <Button type="button" size="compactIcon" variant="ghost" aria-label="Adicionar pergunta para o cliente" title="Adicionar pergunta para o cliente" onClick={() => setRows((current) => [...current, ""])}><Plus className="h-5 w-5" /></Button>
  </div>;
}
