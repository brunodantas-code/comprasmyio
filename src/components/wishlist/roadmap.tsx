import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil, Save, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { CdeButton, CdeNumber } from "@/components/cde/cde-button";
import { confirmAction } from "@/components/confirm-dialog";
import { wishlistStepSchema, type WishlistIdea, type WishlistStep } from "@/lib/wishlist";

type Person = { id: string; full_name: string };
export function WishlistRoadmap({ idea, steps, users, userId, editor }: { idea: WishlistIdea; steps: WishlistStep[]; users: Person[]; userId: string; editor: boolean }) {
  const qc = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const ownSteps = steps.filter(s => s.idea_id === idea.id && !s.deleted_at).sort((a, b) => a.position - b.position);
  const editing = ownSteps.find(s => s.id === editingId);
  const refresh = () => Promise.all([qc.invalidateQueries({ queryKey: ["wishlist"] }), qc.invalidateQueries({ queryKey: ["wishlist-logs", idea.id] })]);
  const change = useMutation({ mutationFn: async ({ step, remove, completed }: { step: WishlistStep; remove?: boolean; completed?: boolean }) => {
    if (remove && !await confirmAction(`Excluir a etapa “${step.title}”?`, { title: "Excluir etapa" })) return;
    const result = await supabase.from("wishlist_roadmap_steps").update(remove ? { deleted_at: new Date().toISOString() } : { completed }).eq("id", step.id).select("id").single();
    if (result.error) throw result.error;
  }, onSuccess: refresh, onError: () => toast.error("Não foi possível alterar a etapa.") });
  return <section className="space-y-3 border-t border-border pt-4" aria-labelledby="wishlist-roadmap">
    <div className="flex items-center justify-between gap-2"><h3 id="wishlist-roadmap" className="text-sm font-semibold">Roadmap <span className="font-normal text-muted-foreground">{ownSteps.filter(s => s.completed).length}/{ownSteps.length}</span></h3>{editor && <CdeButton group="plus" screen="components/wishlist/roadmap.tsx" aria-label="Nova etapa" title="Nova etapa" onClick={() => setEditingId("new")} />}</div>
    <div className="divide-y divide-border">{ownSteps.map((step, index) => <div key={step.id} className="flex min-w-0 items-start gap-3 py-3">
      <Checkbox className="mt-1 shrink-0" aria-label={`Concluir etapa ${step.title}`} checked={step.completed} disabled={change.isPending || (!editor && step.responsible_id !== userId)} onCheckedChange={value => change.mutate({ step, completed: value === true })} />
      <CdeNumber screen="components/wishlist/roadmap.tsx" className="h-6 min-w-6">{index + 1}</CdeNumber>
      <div className="min-w-0 flex-1"><p className={`break-words text-sm ${step.completed ? "text-muted-foreground line-through" : ""}`}>{step.title}</p>{step.description && <p className="whitespace-pre-wrap break-words text-xs text-muted-foreground">{step.description}</p>}<p className="mt-1 text-xs text-muted-foreground">{users.find(u => u.id === step.responsible_id)?.full_name ?? "Sem responsável"} · {step.due_date ? step.due_date.split("-").reverse().join("/") : "Sem prazo"}</p></div>
      {editor && <div className="flex shrink-0 gap-1"><Button variant="ghost" size="compactIcon" title="Editar etapa" aria-label={`Editar etapa ${step.title}`} onClick={() => setEditingId(step.id)}><Pencil /></Button><Button variant="ghost" size="compactIcon" title="Excluir etapa" aria-label={`Excluir etapa ${step.title}`} disabled={change.isPending} onClick={() => change.mutate({ step, remove: true })}><Trash2 /></Button></div>}
    </div>)}</div>
    {!ownSteps.length && !editingId && <p className="text-sm text-muted-foreground">Nenhuma etapa cadastrada.</p>}
    {editingId && editor && <StepForm key={editingId} step={editing} ideaId={idea.id} position={editing?.position ?? (ownSteps.reduce((max, s) => Math.max(max, s.position), -1) + 1)} users={users} onCancel={() => setEditingId(null)} onSaved={async () => { setEditingId(null); await refresh(); }} />}
  </section>;
}
function StepForm({ step, ideaId, position, users, onCancel, onSaved }: { step?: WishlistStep; ideaId: string; position: number; users: Person[]; onCancel: () => void; onSaved: () => Promise<unknown> }) {
  const [responsible, setResponsible] = useState(step?.responsible_id ?? "");
  const save = useMutation({ mutationFn: async (form: HTMLFormElement) => {
    const data = new FormData(form);
    const values = wishlistStepSchema.parse({ title: data.get("title"), description: data.get("description"), responsible_id: responsible || null, due_date: data.get("due_date") || null, position });
    const result = step ? await supabase.from("wishlist_roadmap_steps").update(values).eq("id", step.id).select("id").single() : await supabase.from("wishlist_roadmap_steps").insert({ ...values, idea_id: ideaId }).select("id").single();
    if (result.error) throw result.error;
  }, onSuccess: async () => { await onSaved(); toast.success("Etapa salva"); }, onError: () => toast.error("Confira os campos da etapa e tente novamente.") });
  return <form className="space-y-3 border-t border-border pt-3" onSubmit={event => { event.preventDefault(); save.mutate(event.currentTarget); }}>
    <div className="flex items-center justify-between gap-2"><h4 className="text-sm">{step ? "Editar etapa" : "Nova etapa"}</h4><div className="flex gap-1"><Button type="submit" variant="ghost" size="compactIcon" aria-label="Salvar etapa" title="Salvar etapa" disabled={save.isPending}><Save /></Button><Button type="button" variant="ghost" size="compactIcon" aria-label="Cancelar etapa" title="Cancelar etapa" onClick={onCancel}><X /></Button></div></div>
    <div><Label htmlFor="wishlist-step-title">Título da etapa</Label><Input id="wishlist-step-title" name="title" defaultValue={step?.title} required minLength={3} maxLength={200} /></div>
    <div><Label htmlFor="wishlist-step-description">Descrição da etapa</Label><Textarea id="wishlist-step-description" name="description" defaultValue={step?.description} maxLength={3000} /></div>
    <div className="grid gap-4 sm:grid-cols-2"><div><Label>Responsável</Label><SearchableSelect aria-label="Responsável da etapa" value={responsible} onChange={setResponsible} options={users.map(u => ({ value: u.id, label: u.full_name }))} placeholder="Selecionar usuário" clearable /></div><div><Label htmlFor="wishlist-step-date">Prazo</Label><Input id="wishlist-step-date" type="date" name="due_date" defaultValue={step?.due_date ?? ""} /></div></div>
  </form>;
}