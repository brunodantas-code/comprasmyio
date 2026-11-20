import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Save } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function SiteSurveyClientObservation({ visitId, pointValue, canEdit }: { visitId: string; pointValue: string; canEdit: boolean }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();
  const [kind, id] = pointValue.split(":");
  const queryKey = ["survey-client-observation", visitId, pointValue];
  const { data, isPending, error } = useQuery({ queryKey, queryFn: async () => {
    if ((kind !== "luc" && kind !== "environment") || !id) throw new Error("Ponto não identificado.");
    const result = await supabase.from("site_survey_client_observations").select("observation").eq("visit_id", visitId).eq("point_kind", kind).eq("point_id", id).maybeSingle();
    if (result.error) throw result.error;
    return result.data?.observation ?? "";
  } });
  const save = async () => {
    if (!canEdit || saving || !id || (kind !== "luc" && kind !== "environment")) return;
    setSaving(true);
    try {
      const result = await supabase.from("site_survey_client_observations").upsert({ visit_id: visitId, point_kind: kind, point_id: id, observation: draft.trim() }, { onConflict: "visit_id,point_kind,point_id" }).select("observation").single();
      if (result.error) throw result.error;
      queryClient.setQueryData(queryKey, result.data.observation);
      toast.success("Observações para o cliente salvas.");
      setOpen(false);
    } catch (cause) { toast.error(cause instanceof Error ? cause.message : "Não foi possível salvar as observações."); }
    finally { setSaving(false); }
  };
  return <div className="min-w-0 space-y-2">
    <div className="flex justify-end"><Button type="button" variant="action" size="sm" disabled={isPending} onClick={() => { if (error) { toast.error("Não foi possível carregar as observações."); void queryClient.invalidateQueries({ queryKey }); return; } setDraft(data ?? ""); setOpen(true); }}><FileText className="h-4 w-4 shrink-0" />Observações para o Cliente</Button></div>
    {data ? <p className="whitespace-pre-wrap break-words text-sm text-foreground">{data}</p> : null}
    <Dialog open={open} onOpenChange={(value) => { if (!saving) setOpen(value); }}><DialogContent topActions={canEdit ? <Button type="button" variant="ghost" size="compactIcon" aria-label="Salvar observações para o cliente" title="Salvar observações para o cliente" disabled={saving} onClick={() => void save()}><Save className="h-4 w-4" /></Button> : null}><DialogHeader><DialogTitle>Observações para o Cliente</DialogTitle></DialogHeader><div className="space-y-2"><Label htmlFor={`client-observation-${id}`}>Observações</Label><Textarea id={`client-observation-${id}`} value={draft} onChange={(event) => setDraft(event.target.value)} readOnly={!canEdit} disabled={saving} rows={6} /></div></DialogContent></Dialog>
  </div>;
}