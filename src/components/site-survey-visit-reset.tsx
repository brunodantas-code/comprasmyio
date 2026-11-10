import { RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";

export function SiteSurveyVisitReset({ visitId, onReset }: { visitId: string; onReset: () => void }) {
  async function reset() {
    const result = await supabase.rpc("reset_site_survey_visit", { _visit_id: visitId });
    if (result.error) return toast.error(result.error.message);
    toast.success(`Visita reiniciada: ${result.data ?? 0} respostas apagadas`);
    onReset();
  }
  return <ConfirmDeleteButton title="Reiniciar visita?" description="Todas as respostas e fotos do checklist serão apagadas e a visita voltará para Agendada. As lojas importadas do Excel, ambientes, técnico e agendamento serão mantidos. O reinício fica registrado no histórico." ariaLabel="Reiniciar visita" confirmLabel="Reiniciar visita" pendingLabel="Reiniciando..." onConfirm={() => void reset()} trigger={<Button type="button" size="compactIcon" variant="ghost" className="text-foreground" title="Reiniciar visita" aria-label="Reiniciar visita"><RotateCcw className="h-3.5 w-3.5" /></Button>} />;
}
