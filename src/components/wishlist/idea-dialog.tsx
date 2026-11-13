import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, History, Pencil, Save, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CdeDisclosureIcon } from "@/components/cde/cde-button";
import { confirmAction } from "@/components/confirm-dialog";
import { MilestoneTimeline } from "@/components/milestone-timeline";
import { canEditWishlistIdea, WISHLIST_STATUSES, wishlistHistoryText, wishlistIdeaSchema, wishlistProjectExport, type WishlistIdea, type WishlistMessage, type WishlistStep } from "@/lib/wishlist";
import { WishlistConversation } from "./conversation";
import { WishlistRoadmap } from "./roadmap";

type Person = { id: string; full_name: string };
export function WishlistIdeaDialog({ idea, messages, steps, users, userId, isAdmin, onClose }: { idea: WishlistIdea | null; messages: WishlistMessage[]; steps: WishlistStep[]; users: Person[]; userId: string; isAdmin: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const editor = !idea || canEditWishlistIdea(idea, userId, isAdmin);
  const [editing, setEditing] = useState(!idea);
  const [historyOpen, setHistoryOpen] = useState(false);
  const refresh = () => qc.invalidateQueries({ queryKey: ["wishlist"] });
  const logs = useQuery({ queryKey: ["wishlist-logs", idea?.id], enabled: Boolean(idea) && historyOpen, queryFn: async () => {
    if (!idea) return [];
    const result = await supabase.from("wishlist_logs").select("*").eq("idea_id", idea.id).order("created_at");
    if (result.error) throw result.error;
    return result.data;
  } });
  const save = useMutation({ mutationFn: async (form: HTMLFormElement) => {
    const fields = new FormData(form);
    const values = wishlistIdeaSchema.parse({ title: fields.get("title"), description: fields.get("description"), expected_result: fields.get("expected_result"), status: fields.get("status") });
    const result = idea ? await supabase.from("wishlist_ideas").update(values).eq("id", idea.id).select("id").single() : await supabase.from("wishlist_ideas").insert({ ...values, idealizer_id: userId }).select("id").single();
    if (result.error) throw result.error;
  }, onSuccess: async () => { await refresh(); toast.success("Desejo salvo"); onClose(); }, onError: () => toast.error("Confira os campos do desejo e tente novamente.") });
  const remove = useMutation({ mutationFn: async () => {
    if (!idea || !await confirmAction(`Excluir o desejo “${idea.title}”? O histórico será preservado.`, { title: "Excluir desejo" })) return false;
    const result = await supabase.from("wishlist_ideas").update({ deleted_at: new Date().toISOString() }).eq("id", idea.id).select("id").single();
    if (result.error) throw result.error;
    return true;
  }, onSuccess: async result => { if (result) { await refresh(); onClose(); toast.success("Desejo excluído"); } }, onError: () => toast.error("Não foi possível excluir o desejo.") });
  const name = (id: string | null) => users.find(u => u.id === id)?.full_name || "Usuário";
  function exportProject() {
    if (!idea) return;
    const payload = wishlistProjectExport(idea, steps, messages, name(idea.idealizer_id));
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
    const link = document.createElement("a"); link.href = url; link.download = `Wishlist-${idea.title.replace(/[^\p{L}\p{N}-]+/gu, "-").slice(0, 70)}.json`; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <Dialog open onOpenChange={open => { if (!open && !save.isPending) onClose(); }}><DialogContent aria-describedby={undefined} className="!max-w-3xl !min-w-0 overflow-x-hidden [&>*]:min-w-0">
    <DialogHeader className="sticky top-0 z-20 -mx-4 -mt-1 flex flex-row items-start justify-between gap-2 bg-background px-4 pb-3 pr-12 sm:-mx-6 sm:px-6 sm:pr-14">
      <DialogTitle className="min-w-0 flex-1 break-words text-left leading-snug">{idea ? idea.title : "Novo desejo"}</DialogTitle>
      <div className="flex shrink-0 items-center gap-1">
        {editing && editor ? <><Button form="wishlist-idea-form" type="submit" variant="ghost" size="compactIcon" aria-label="Salvar desejo" title="Salvar desejo" disabled={save.isPending}><Save /></Button>{idea && <Button variant="ghost" size="compactIcon" aria-label="Cancelar edição" title="Cancelar edição" onClick={() => setEditing(false)}><X /></Button>}</> : editor && <Button variant="ghost" size="compactIcon" aria-label="Editar desejo" title="Editar desejo" onClick={() => setEditing(true)}><Pencil /></Button>}
        {idea && editor && <Button variant="ghost" size="compactIcon" aria-label="Excluir desejo" title="Excluir desejo" disabled={remove.isPending} onClick={() => remove.mutate()}><Trash2 /></Button>}
      </div>
    </DialogHeader>
    {editing && editor ? <form id="wishlist-idea-form" className="space-y-4" onSubmit={event => { event.preventDefault(); save.mutate(event.currentTarget); }}>
      <div className="space-y-1"><Label htmlFor="wishlist-title">Título do desejo</Label><Input id="wishlist-title" name="title" required minLength={3} maxLength={160} defaultValue={idea?.title} /></div>
      <div className="space-y-1"><Label htmlFor="wishlist-description">Descrição</Label><Textarea id="wishlist-description" name="description" required minLength={10} maxLength={6000} defaultValue={idea?.description} className="min-h-36" /></div>
      <div className="space-y-1"><Label htmlFor="wishlist-result">Resultado esperado <span className="text-xs font-normal text-muted-foreground">opcional</span></Label><Textarea id="wishlist-result" name="expected_result" maxLength={3000} defaultValue={idea?.expected_result} /></div>
      <div className="space-y-1"><Label>Situação</Label><Select name="status" defaultValue={idea?.status ?? "ideia"}><SelectTrigger aria-label="Situação do desejo"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(WISHLIST_STATUSES).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div>
    </form> : idea && <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground"><span>Idealizador: {name(idea.idealizer_id)} · {new Date(idea.created_at).toLocaleDateString("pt-BR")}</span><span>{WISHLIST_STATUSES[idea.status as keyof typeof WISHLIST_STATUSES]}</span></div>
      <section className="space-y-1"><h3 className="text-xs text-muted-foreground">Descrição</h3><p className="whitespace-pre-wrap break-words text-sm [overflow-wrap:anywhere]">{idea.description}</p></section>
      {idea.expected_result && <section className="space-y-1"><h3 className="text-xs text-muted-foreground">Resultado esperado</h3><p className="whitespace-pre-wrap break-words text-sm">{idea.expected_result}</p></section>}
      <WishlistRoadmap idea={idea} steps={steps} users={users} userId={userId} editor={editor} />
      <div className="flex justify-end"><Button variant="ghost" size="compactIcon" title="Exportar desejo e roadmap para futura migração ao myio Projects" aria-label="Exportar para myio Projects" onClick={exportProject}><Download /></Button></div>
      <WishlistConversation idea={idea} messages={messages} users={users} userId={userId} />
      <section className="space-y-3 border-t border-border pt-4"><Button variant="ghost" className="!h-auto !w-full !min-w-0 !max-w-none justify-between !bg-transparent px-0 py-2" aria-expanded={historyOpen} onClick={() => setHistoryOpen(!historyOpen)}><span className="flex items-center gap-2 text-sm"><History className="size-4" />Histórico</span><CdeDisclosureIcon open={historyOpen} screen="components/wishlist/idea-dialog.tsx" /></Button>{historyOpen && (logs.isPending ? <p className="text-xs text-muted-foreground">Carregando histórico...</p> : logs.error ? <p className="text-xs text-destructive">Não foi possível carregar o histórico.</p> : <MilestoneTimeline entries={(logs.data ?? []).map(log => ({ id: log.id, text: `${wishlistHistoryText(log.text, name)}\npor ${name(log.actor_id)}`, created_at: log.created_at }))} />)}</section>
    </div>}
  </DialogContent></Dialog>;
}