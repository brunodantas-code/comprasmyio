import { useState } from "react";
import { useQuery, useQueryClient, queryOptions } from "@tanstack/react-query";
import { Tag, Pencil, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CdeColorSwatches } from "@/components/cde/top-icon-style-editor";
import { ICONS } from "@/components/cde/cde-render";
import { confirmAction } from "@/components/confirm-dialog";
import type { Database } from "@/integrations/supabase/types";

type TodoLabel = Database["public"]["Tables"]["personal_todo_labels"]["Row"];
export const todoLabelsOptions = (userId: string) => queryOptions({
  queryKey: ["todo-labels", userId],
  queryFn: async () => {
    const [labels, links] = await Promise.all([supabase.from("personal_todo_labels").select("*").eq("owner_id", userId).order("name"), supabase.from("personal_todo_label_links").select("*").eq("owner_id", userId)]);
    if (labels.error) throw labels.error; if (links.error) throw links.error;
    return { labels: labels.data, links: links.data };
  },
});
export function TodoLabelMark({ label }: { label: TodoLabel }) {
  const Icon = ICONS[label.icon] ?? Tag;
  return <span className="inline-flex max-w-full items-center gap-1 text-xs"><Icon className="size-4 shrink-0" style={{ color: label.color || "var(--foreground)" }} /><span className="break-words">{label.name}</span></span>;
}
export async function saveTodoLabels(todoId: string, userId: string, ids: string[]) {
  const result = await supabase.from("personal_todo_label_links").select("label_id").eq("todo_id", todoId).eq("owner_id", userId);
  if (result.error) throw result.error;
  const remove = result.data.map(l => l.label_id).filter(id => !ids.includes(id));
  if (remove.length) {
    const deleted = await supabase.from("personal_todo_label_links").delete().eq("todo_id", todoId).eq("owner_id", userId).in("label_id", remove);
    if (deleted.error) throw deleted.error;
  }
  const add = ids.filter(id => !result.data.some(l => l.label_id === id));
  if (add.length) {
    const inserted = await supabase.from("personal_todo_label_links").insert(add.map(label_id => ({ todo_id: todoId, owner_id: userId, label_id })));
    if (inserted.error) throw inserted.error;
  }
}
export function TodoLabelChoices({ labels, selected, onChange, disabled }: { labels: TodoLabel[]; selected: string[]; onChange: (ids: string[]) => void; disabled?: boolean }) {
  return <div className="space-y-2"><Label>Etiquetas</Label><div className="flex flex-wrap gap-3">{labels.map(l => <label key={l.id} className="flex min-w-0 items-center gap-2"><Checkbox disabled={disabled} aria-label={`Etiqueta ${l.name}`} checked={selected.includes(l.id)} onCheckedChange={checked => onChange(checked ? [...selected, l.id] : selected.filter(id => id !== l.id))} /><TodoLabelMark label={l} /></label>)}</div></div>;
}
export function TodoLabelsManager({ userId }: { userId: string }) {
  const { data } = useQuery(todoLabelsOptions(userId));
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<TodoLabel | null>(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState("var(--whatsapp-green)");
  const [icon, setIcon] = useState("Tag");
  const [busy, setBusy] = useState(false);
  const reset = () => { setEdit(null); setName(""); setColor("var(--whatsapp-green)"); setIcon("Tag"); };
  async function save() {
    setBusy(true);
    try {
      const values = { name: name.trim(), color, icon };
      const r = edit ? await supabase.from("personal_todo_labels").update(values).eq("id", edit.id).eq("owner_id", userId).select("id").single() : await supabase.from("personal_todo_labels").insert({ ...values, owner_id: userId }).select("id").single();
      if (r.error) throw r.error;
      await qc.invalidateQueries({ queryKey: ["todo-labels"] }); reset(); toast.success("Etiqueta salva");
    } catch { toast.error("Não foi possível salvar. Verifique se o nome já existe."); } finally { setBusy(false); }
  }
  return <><Button variant="ghost" size="compactIcon" aria-label="Gerenciar etiquetas" title="Gerenciar etiquetas" onClick={() => setOpen(true)}><Tag /></Button><Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-h-[85vh] overflow-y-auto"><DialogHeader><DialogTitle>Minhas etiquetas</DialogTitle></DialogHeader>
    <div className="divide-y divide-border">{data?.labels.map(l => <div key={l.id} className="flex items-center justify-between gap-2 py-2"><TodoLabelMark label={l} /><div className="flex shrink-0 gap-1"><Button variant="ghost" size="compactIcon" aria-label={`Editar etiqueta ${l.name}`} title="Editar etiqueta" onClick={() => { setEdit(l); setName(l.name); setColor(l.color); setIcon(l.icon); }}><Pencil /></Button><Button variant="ghost" size="compactIcon" aria-label={`Excluir etiqueta ${l.name}`} title="Excluir etiqueta" onClick={async () => { if (!await confirmAction(`Excluir a etiqueta “${l.name}”? As tarefas serão preservadas.`, { title: "Excluir etiqueta" })) return; const r = await supabase.from("personal_todo_labels").delete().eq("id", l.id).eq("owner_id", userId); if (r.error) return toast.error("Não foi possível excluir a etiqueta."); if (edit?.id === l.id) reset(); await qc.invalidateQueries({ queryKey: ["todo-labels"] }); }}><Trash2 /></Button></div></div>)}</div>
    <form className="space-y-4" onSubmit={e => { e.preventDefault(); void save(); }}><div className="flex items-center justify-between"><Label htmlFor="todo-label-name">{edit ? "Editar etiqueta" : "Nova etiqueta"}</Label>{edit && <Button type="button" variant="ghost" size="compactIcon" title="Nova etiqueta" aria-label="Nova etiqueta" onClick={reset}><Plus /></Button>}</div><Input id="todo-label-name" value={name} onChange={e => setName(e.target.value)} required maxLength={80} />
    <CdeColorSwatches label="Cor" value={color} onChange={setColor} /><div className="space-y-2"><Label>Símbolo</Label><div className="grid grid-cols-6 gap-1">{Object.entries(ICONS).map(([key, Icon]) => <Button key={key} type="button" variant="ghost" size="compactIcon" title={key} aria-label={`Símbolo ${key}`} aria-pressed={key === icon} className={key === icon ? "ring-2 ring-primary" : ""} onClick={() => setIcon(key)}><Icon /></Button>)}</div></div><div className="flex justify-end gap-2">{edit && <Button type="button" variant="outline" onClick={reset}>Cancelar</Button>}<Button type="submit" disabled={busy || !name.trim()}>{busy ? "Salvando..." : "Salvar"}</Button></div></form>
  </DialogContent></Dialog></>;
}