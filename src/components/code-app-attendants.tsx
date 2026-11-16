import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { confirmAction } from "@/components/confirm-dialog";

type Admin = { id: string; full_name: string | null; email: string | null };

function AttendantField({ appKey, appName, currentId, admins }: { appKey: string; appName: string; currentId: string; admins: Admin[] }) {
  const [value, setValue] = useState(currentId);
  const queryClient = useQueryClient();
  const save = useMutation({
    mutationFn: async () => {
      if (!await confirmAction(value ? `Direcionar os chamados de ${appName} ao Admin selecionado? Os chamados não concluídos serão redistribuídos.` : `Remover o vínculo de ${appName}? Os chamados não concluídos ficarão sem responsável.`)) return false;
      const result = value
        ? await supabase.from("code_app_attendants").upsert({ app_key: appKey, attendant_id: value })
        : await supabase.from("code_app_attendants").delete().eq("app_key", appKey);
      if (result.error) throw result.error;
      return true;
    },
    onSuccess: async (saved) => {
      if (!saved) return;
      await Promise.all(["code-app-attendants", "development-tickets", "pending-actions", "central-admin"].map(key => queryClient.invalidateQueries({ queryKey: [key] })));
      toast.success("Responsável atualizado");
    },
    onError: (error: Error) => toast.error(error.message),
  });
  return <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-end gap-2">
    <div className="min-w-0 space-y-1"><Label>{appName}</Label><SearchableSelect aria-label={`Admin responsável por ${appName}`} value={value} onChange={setValue} placeholder="Sem responsável" disabled={save.isPending} options={admins.map(admin => ({ value: admin.id, label: admin.full_name || admin.email || "Admin" }))} /></div>
    <Button type="button" variant="ghost" size="icon" title={`Salvar responsável por ${appName}`} aria-label={`Salvar responsável por ${appName}`} onClick={() => save.mutate()} disabled={save.isPending || value === currentId}><Save className="h-4 w-4" /></Button>
  </div>;
}

export function CodeAppAttendants({ open, onOpenChange, admins, appNames }: { open: boolean; onOpenChange: (open: boolean) => void; admins: Admin[]; appNames: Record<string, string> }) {
  const query = useQuery({ queryKey: ["code-app-attendants"], enabled: open, queryFn: async () => {
    const [apps, assignments] = await Promise.all([supabase.from("erp_apps").select("key,name").eq("active", true).order("position"), supabase.from("code_app_attendants").select("app_key,attendant_id")]);
    if (apps.error) throw apps.error;
    if (assignments.error) throw assignments.error;
    return { apps: apps.data, assignments: new Map(assignments.data.map(a => [a.app_key, a.attendant_id])) };
  } });
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[90dvh] max-w-2xl overflow-y-auto"><DialogHeader><DialogTitle>Usuários · Code</DialogTitle></DialogHeader>
    {query.isPending ? <p className="text-sm text-muted-foreground">Carregando responsáveis...</p> : query.isError ? <p className="text-sm text-destructive">Não foi possível carregar os responsáveis.</p> : <div className="grid min-w-0 gap-5 sm:grid-cols-2">{query.data.apps.map(app => <AttendantField key={`${app.key}:${query.data.assignments.get(app.key) ?? ""}`} appKey={app.key} appName={appNames[app.key] ?? app.name} currentId={query.data.assignments.get(app.key) ?? ""} admins={admins} />)}</div>}
  </DialogContent></Dialog>;
}