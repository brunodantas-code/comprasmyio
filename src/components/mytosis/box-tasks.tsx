import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { History, MessageCircleQuestion, Pencil, Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { MilestoneTimeline } from "@/components/milestone-timeline";
import { canCompleteBoxTask } from "@/lib/mytosis-tasks";
import { cn } from "@/lib/utils";
import type { MytosisData } from "./use-mytosis";
import { ChecklistText } from "./checklist-text";

export type TaskSelection = { nodeId: string; taskId?: string } | null;

export function useTaskCompletion() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      const { error } = await supabase.from("mytosis_tasks").update({ completed }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { client.invalidateQueries({ queryKey: ["mytosis"] }); client.invalidateQueries({ queryKey: ["mytosis-task"] }); },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function BoxTaskList({ nodeId, data, onOpen, expanded = true }: { nodeId: string; data: MytosisData; onOpen: (selection: TaskSelection) => void; expanded?: boolean }) {
  const completion = useTaskCompletion();
  const tasks = data.tasks.filter((t) => t.node_id === nodeId);
  if (!tasks.length) return null;
  return <div id={`mytosis-tasks-${nodeId}`} inert={!expanded} aria-hidden={!expanded} className={cn("grid transition-[grid-template-rows,opacity] duration-500 ease-in-out motion-reduce:transition-none", expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")}><div className="min-h-0 overflow-hidden"><ul className="ml-[2%] mt-2 space-y-1 border-l border-primary/30 pl-2">
    {tasks.map((task) => <li key={task.id} className="flex min-h-7 items-center gap-2">
      <Checkbox aria-label={`Concluir tarefa ${task.title}`} checked={task.completed} disabled={completion.isPending || !canCompleteBoxTask(task, data.userId, !!data.role)} onCheckedChange={(checked) => completion.mutate({ id: task.id, completed: checked === true })} />
      <Button variant="ghost" className={cn("h-auto min-w-0 justify-start rounded-none p-0 text-left text-xs font-normal !bg-transparent !text-foreground hover:!bg-transparent hover:!text-primary", task.completed && "!text-muted-foreground line-through")} onClick={() => onOpen({ nodeId, taskId: task.id })}><span className="break-words">{task.title}</span></Button>
    </li>)}
  </ul></div></div>;
}

export function BoxTaskDialog({ selection, onClose, onSelect, data, canEdit }: { selection: TaskSelection; onClose: () => void; onSelect: (s: TaskSelection) => void; data: MytosisData; canEdit: boolean }) {
  const client = useQueryClient();
  const task = data.tasks.find((t) => t.id === selection?.taskId);
  const node = data.nodes.find((n) => n.id === selection?.nodeId);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [responsible, setResponsible] = useState("");
  const [due, setDue] = useState("");
  const [involved, setInvolved] = useState<string[]>([]);
  const [text, setText] = useState("");
  const [replyId, setReplyId] = useState("");
  const [messageEdit, setMessageEdit] = useState<string | null>(null);
  const [messageText, setMessageText] = useState("");
  const completion = useTaskCompletion();
  const isOwner = task ? canCompleteBoxTask(task, data.userId, !!data.role) : canEdit;
  const person = (id: string | null) => data.users.find((u) => u.id === id)?.full_name ?? "Usuário";
  useEffect(() => {
    if (!selection) return;
    const current = data.tasks.find((t) => t.id === selection.taskId);
    setEditing(!current); setTitle(current?.title ?? ""); setDescription(current?.description ?? "");
    setResponsible(current?.responsible_id ?? node?.responsible_id ?? data.userId);
    setDue(current?.due_date ?? ""); setInvolved(current?.involved_ids ?? []);
    setText(""); setReplyId(""); setMessageEdit(null);
  }, [selection?.nodeId, selection?.taskId]); // eslint-disable-line react-hooks/exhaustive-deps

  const details = useQuery({
    queryKey: ["mytosis-task", task?.id], enabled: !!selection && !!task, refetchInterval: 15000,
    queryFn: async () => {
      if (!task) throw new Error("Tarefa não encontrada.");
      const [messages, logs, access] = await Promise.all([
        supabase.from("mytosis_task_messages").select("*").eq("task_id", task.id).order("created_at"),
        supabase.from("mytosis_task_logs").select("*").eq("task_id", task.id).order("created_at"),
        supabase.rpc("mytosis_task_can_converse", { _task_id: task.id, _user_id: data.userId }),
      ]);
      if (messages.error) throw messages.error; if (logs.error) throw logs.error; if (access.error) throw access.error;
      return { messages: messages.data ?? [], logs: logs.data ?? [], canConverse: access.data };
    },
  });
  const refresh = async () => { await client.invalidateQueries({ queryKey: ["mytosis"] }); await client.invalidateQueries({ queryKey: ["mytosis-task"] }); };
  const save = useMutation({
    mutationFn: async () => {
      if (!selection || !title.trim() || !responsible) throw new Error("Informe título e responsável.");
      const row = { title: title.trim(), description: description.trim(), responsible_id: responsible, due_date: due || null, involved_ids: involved };
      const result = task
        ? await supabase.from("mytosis_tasks").update(row).eq("id", task.id).select("id").single()
        : await supabase.from("mytosis_tasks").insert({ ...row, node_id: selection.nodeId, created_by: data.userId }).select("id").single();
      if (result.error) throw result.error;
      return result.data.id;
    },
    onSuccess: async (id) => { await refresh(); setEditing(false); if (selection) onSelect({ nodeId: selection.nodeId, taskId: id }); toast.success("Tarefa salva."); },
    onError: (e: Error) => toast.error(e.message),
  });
  const send = useMutation({
    mutationFn: async () => {
      if (!task || !text.trim()) throw new Error("Escreva a pergunta ou resposta.");
      const { error } = await supabase.from("mytosis_task_messages").insert({ task_id: task.id, author_id: data.userId, text: text.trim(), kind: replyId ? "answer" : "question", reply_to_id: replyId || null });
      if (error) throw error;
    },
    onSuccess: async () => { setText(""); setReplyId(""); await refresh(); }, onError: (e: Error) => toast.error(e.message),
  });
  const editMessage = useMutation({
    mutationFn: async () => {
      if (!messageEdit || !messageText.trim()) throw new Error("Informe o texto.");
      const { error } = await supabase.from("mytosis_task_messages").update({ text: messageText.trim() }).eq("id", messageEdit);
      if (error) throw error;
    }, onSuccess: async () => { setMessageEdit(null); await refresh(); }, onError: (e: Error) => toast.error(e.message),
  });
  const messages = details.data?.messages ?? [];
  const questions = messages.filter((m) => m.kind === "question");
  const pending = questions.filter((q) => q.author_id !== data.userId && !messages.some((m) => m.reply_to_id === q.id));
  const renderMessage = (m: typeof messages[number], index: number) => <div key={m.id} className={cn("rounded-md border p-3", m.kind === "answer" ? "ml-4 border-primary/40 bg-primary/10" : "border-border bg-muted/40")}>
    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground"><span>{m.kind === "question" ? "Pergunta" : "Resposta"} {index} · {person(m.author_id)}</span><span className="flex items-center gap-2">{new Date(m.created_at).toLocaleString("pt-BR")}{m.author_id === data.userId && details.data?.canConverse ? <Button variant="ghost" size="icon" className="h-6 w-6 !text-primary" aria-label="Editar mensagem" title="Editar mensagem" onClick={() => { setMessageEdit(m.id); setMessageText(m.text); }}><Pencil className="h-3.5 w-3.5" /></Button> : null}</span></div>
    {messageEdit === m.id ? <div className="mt-2 space-y-2"><ChecklistText label="Editar mensagem" value={messageText} onChange={setMessageText} maxLength={4000} multiline /><div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setMessageEdit(null)}>Cancelar</Button><Button variant="outline" onClick={() => editMessage.mutate()} disabled={editMessage.isPending}>Salvar</Button></div></div> : <p className="mt-2 whitespace-pre-wrap break-words text-sm">{m.text}</p>}
  </div>;

  return <Dialog open={!!selection} onOpenChange={(open) => !open && onClose()}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
    <DialogHeader className="pr-8"><DialogTitle className="flex items-start gap-3 font-normal"><span className="min-w-0 break-words">{task?.title ?? "Nova tarefa"}</span>{task && isOwner && !editing ? <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 !text-primary" title="Editar tarefa" aria-label="Editar tarefa" onClick={() => setEditing(true)}><Pencil className="h-4 w-4" /></Button> : null}</DialogTitle><DialogDescription>{node?.title}{task ? ` · Criada por ${person(task.created_by)} em ${new Date(task.created_at).toLocaleString("pt-BR")}` : ""}</DialogDescription></DialogHeader>
    {editing ? <div className="grid gap-4">
      <div className="grid gap-1.5"><Label htmlFor="task-title">Título</Label><ChecklistText id="task-title" label="Título" value={title} onChange={setTitle} maxLength={200} hint="Redija a tarefa do check List." autoFocus /></div>
      <div className="grid gap-1.5"><Label htmlFor="task-description">Descrição</Label><ChecklistText id="task-description" label="Descrição" value={description} onChange={setDescription} multiline hint="Redija a descrição da tarefa." /></div>
      <div className="grid gap-4 sm:grid-cols-2"><div className="grid gap-1.5"><Label>Responsável</Label><SearchableSelect value={responsible} onChange={setResponsible} options={data.users.map((u) => ({ value: u.id, label: u.full_name }))} /></div><div className="grid gap-1.5"><Label htmlFor="task-due">Prazo</Label><Input id="task-due" type="date" value={due} onChange={(e) => setDue(e.target.value)} /></div></div>
      <div className="space-y-2"><Label>Demais envolvidos</Label><div className="max-h-32 space-y-2 overflow-y-auto">{data.users.filter((u) => u.id !== responsible).map((u) => <label key={u.id} className="flex items-center gap-2 text-sm"><Checkbox checked={involved.includes(u.id)} onCheckedChange={(checked) => setInvolved((ids) => checked ? [...ids, u.id] : ids.filter((id) => id !== u.id))} />{u.full_name}</label>)}</div></div>
      <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => task ? setEditing(false) : onClose()}>Cancelar</Button><Button variant="outline" disabled={save.isPending} onClick={() => save.mutate()}>Salvar</Button></div>
    </div> : task ? <div className="space-y-3"><label className="flex items-center gap-2 text-sm"><Checkbox aria-label="Conclusão da tarefa" checked={task.completed} disabled={!isOwner || completion.isPending} onCheckedChange={(checked) => completion.mutate({ id: task.id, completed: checked === true })} />{task.completed ? "Concluída" : "Pendente"}</label><p className="whitespace-pre-wrap break-words text-sm">{task.description}</p><p className="text-xs text-muted-foreground">Responsável: {person(task.responsible_id)} · Prazo: {task.due_date ? new Date(`${task.due_date}T12:00:00`).toLocaleDateString("pt-BR") : "—"}</p>{task.involved_ids.length ? <p className="text-xs text-muted-foreground">Envolvidos: {task.involved_ids.map(person).join(", ")}</p> : null}</div> : null}
    {task ? <>
      <section className="space-y-3 border-t border-border pt-4"><h3 className="flex items-center gap-2 text-sm font-normal"><MessageCircleQuestion className="h-4 w-4" />Conversa</h3>
        {details.isLoading ? <p className="text-sm text-muted-foreground">Carregando...</p> : null}{details.error ? <p role="alert" className="text-sm text-destructive">Não foi possível carregar a conversa. {details.error.message}</p> : null}
        {questions.map((q, i) => <div key={q.id} className="space-y-2">{renderMessage(q, i + 1)}{messages.filter((a) => a.reply_to_id === q.id).map((a) => renderMessage(a, i + 1))}</div>)}
        {details.data?.canConverse ? <div className="space-y-2">{pending.length ? <SearchableSelect value={replyId} onChange={setReplyId} placeholder="Nova pergunta" options={[{ value: "", label: "Nova pergunta" }, ...pending.map((q) => ({ value: q.id, label: `Responder à pergunta ${questions.findIndex((p) => p.id === q.id) + 1}: ${q.text}` }))]} /> : null}<ChecklistText label={replyId ? "Resposta" : "Nova pergunta"} hint={replyId ? "Escreva a resposta" : "Escreva uma pergunta"} value={text} onChange={setText} maxLength={4000} multiline /><div className="flex justify-end"><Button variant="outline" onClick={() => send.mutate()} disabled={send.isPending || !text.trim()}><Send className="h-4 w-4" />{replyId ? "Enviar resposta" : "Enviar pergunta"}</Button></div></div> : null}
      </section>
      <section className="space-y-3 border-t border-border pt-4"><h3 className="flex items-center gap-2 text-sm font-normal"><History className="h-4 w-4" />Histórico</h3><MilestoneTimeline entries={(details.data?.logs ?? []).map((log) => ({ id: log.id, created_at: log.created_at, text: `${log.text}\npor ${person(log.actor_id)}` }))} /></section>
      <DialogFooter><Button variant="outline" onClick={onClose}>Fechar</Button></DialogFooter>
    </> : null}
  </DialogContent></Dialog>;
}