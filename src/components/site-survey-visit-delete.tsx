import { useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

type RelatedCall = { id: string; call_number: string | null; title: string; description: string; status: string };

export function SiteSurveyVisitDelete({ visitId, visitNumber, onDeleted }: { visitId: string; visitNumber: number; onDeleted: () => void }) {
  const [open, setOpen] = useState(false);
  const [calls, setCalls] = useState<RelatedCall[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function inspect() {
    setLoading(true);
    setError("");
    setCalls([]);
    const result = await supabase.rpc("list_site_survey_visit_calls", { _visit_id: visitId });
    if (result.error) setError(`Não foi possível verificar os chamados: ${result.error.message}`);
    else setCalls(result.data ?? []);
    setLoading(false);
  }

  async function remove(deleteCalls: boolean) {
    setPending(true);
    const result = await supabase.rpc("delete_site_survey_visit", { _visit_id: visitId, _delete_calls: deleteCalls });
    setPending(false);
    if (result.error) return toast.error(result.error.message);
    setOpen(false);
    toast.success(deleteCalls && calls.length ? "Visita e chamados excluídos" : "Visita excluída");
    onDeleted();
  }

  return <Dialog open={open} onOpenChange={(value) => { if (!pending) { setOpen(value); if (value) void inspect(); } }}>
    <DialogTrigger asChild><Button type="button" size="compactIcon" variant="ghost" className="text-destructive hover:text-destructive" title="Excluir visita" aria-label="Excluir visita"><Trash2 className="h-3.5 w-3.5" /></Button></DialogTrigger>
    <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
      <DialogHeader><DialogTitle>Excluir visita {String(visitNumber).padStart(12, "0")}?</DialogTitle><DialogDescription>A visita, as respostas, fotos e histórico serão excluídos definitivamente.</DialogDescription></DialogHeader>
      {loading ? <p className="text-sm text-muted-foreground">Verificando chamados do OpDesk...</p> : error ? <p role="alert" className="text-sm text-destructive">{error}</p> : calls.length ? <div className="space-y-3"><p className="text-sm font-medium">{calls.length} {calls.length === 1 ? "chamado vinculado" : "chamados vinculados"} no OpDesk:</p><div className="max-h-60 divide-y overflow-y-auto border-y">{calls.map((call) => <div key={call.id} className="py-2 text-sm"><p className="font-semibold">#{call.call_number ?? "Sem número"} · {call.title} <span className="font-normal text-muted-foreground">({call.status})</span></p><p className="line-clamp-2 whitespace-pre-wrap text-muted-foreground">{call.description}</p></div>)}</div><p className="text-sm text-muted-foreground">Se mantidos, os chamados continuam no OpDesk, com o número da visita registrado, mas sem acesso à visita excluída.</p></div> : <p className="text-sm text-muted-foreground">Não há chamados vinculados a esta visita.</p>}
      <DialogFooter className="grid grid-cols-2 gap-2 sm:grid sm:grid-cols-2">
        <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>Cancelar</Button>
        {!loading && !error && calls.length > 0 ? <><Button type="button" variant="outline" disabled={pending} onClick={() => void remove(false)} className="h-auto min-h-10 whitespace-normal">Excluir visita e manter chamados</Button><Button type="button" variant="destructive" disabled={pending} onClick={() => void remove(true)} className="col-span-2 h-auto min-h-10 whitespace-normal">Excluir visita e chamados</Button></> : <Button type="button" variant="destructive" disabled={loading || pending || Boolean(error)} onClick={() => void remove(false)}>{pending ? "Excluindo..." : "Excluir visita"}</Button>}
      </DialogFooter>
    </DialogContent>
  </Dialog>;
}