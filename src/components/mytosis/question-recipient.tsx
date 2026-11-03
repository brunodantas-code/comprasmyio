import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Label } from "@/components/ui/label";

export function QuestionRecipient({ nodeId, taskId, value, onChange }: { nodeId: string; taskId?: string; value: string; onChange: (value: string) => void }) {
  const recipients = useQuery({
    queryKey: ["mytosis-question-recipients", nodeId, taskId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("mytosis_question_recipients", { _node_id: nodeId, _task_id: taskId });
      if (error) throw error;
      return data;
    },
  });
  return <div className="grid gap-1.5"><Label>Destinatário</Label><SearchableSelect aria-label="Destinatário da pergunta" value={value} onChange={onChange} placeholder="Selecione o destinatário" options={(recipients.data ?? []).map((user) => ({ value: user.id, label: user.full_name }))} />{recipients.error ? <p role="alert" className="text-xs text-destructive">Não foi possível carregar os destinatários.</p> : null}</div>;
}