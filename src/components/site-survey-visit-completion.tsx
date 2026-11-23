import { useState } from "react";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { canCompleteSurveyVisit, surveyVisitCompletionTime } from "@/lib/site-survey-visit-completion";

type Props = {
  visit: { id: string; status: string; started_at: string | null; completed_at: string | null; submitted_at: string | null };
  beforeComplete: () => Promise<void>;
  onChanged: () => void;
};

export function SiteSurveyVisitCompletion({ visit, beforeComplete, onChanged }: Props) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [saving, setSaving] = useState(false);
  if (!canCompleteSurveyVisit(visit.status)) return null;

  async function complete() {
    if (saving) return;
    setSaving(true);
    try {
      const completed_at = surveyVisitCompletionTime(date, time, visit.started_at, visit.completed_at);
      await beforeComplete();
      // Only the visit is closed: point status, responses and pending fields remain intact.
      const result = await supabase.from("site_survey_visits")
        .update({ status: "concluida", completed_at })
        .eq("id", visit.id).in("status", ["em_andamento", "em_revisao"])
        .select("id,status,completed_at").single();
      if (result.error) throw result.error;
      if (result.data.status !== "concluida") throw new Error("Não foi possível confirmar o encerramento.");
      setOpen(false);
      toast.success("Visita concluída; pendências preservadas para complementação.");
      onChanged();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível encerrar a visita.");
    } finally {
      setSaving(false);
    }
  }

  return <>
    <Button size="sm" onClick={() => setOpen(true)}><Check className="size-4" />Concluir visita técnica</Button>
    <Dialog open={open} onOpenChange={value => { if (!saving) setOpen(value); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Concluir visita técnica</DialogTitle><DialogDescription>Confirme o encerramento definitivo no local. Respostas, fotos e pendências serão preservadas; os pontos não serão concluídos automaticamente.</DialogDescription></DialogHeader>
        {visit.completed_at ? <p className="text-sm">Encerramento registrado: {new Date(visit.completed_at).toLocaleString("pt-BR")}</p> : <div className="grid grid-cols-2 items-end gap-4">
          <div className="min-w-0 space-y-1"><Label htmlFor={`survey-end-date-${visit.id}`}>Data real do encerramento</Label><Input id={`survey-end-date-${visit.id}`} type="date" value={date} onChange={event => setDate(event.target.value)} /></div>
          <div className="min-w-0 space-y-1"><Label htmlFor={`survey-end-time-${visit.id}`}>Horário real do encerramento</Label><Input id={`survey-end-time-${visit.id}`} type="time" value={time} onChange={event => setTime(event.target.value)} /></div>
        </div>}
        <div className="flex justify-end"><Button disabled={saving || (!visit.completed_at && (!date || !time))} onClick={() => void complete()}><Check className="size-4" />{saving ? "Concluindo..." : "Confirmar conclusão"}</Button></div>
      </DialogContent>
    </Dialog>
  </>;
}