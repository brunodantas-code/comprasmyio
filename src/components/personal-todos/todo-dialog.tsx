import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { History, Paperclip, Send, Trash2, Plus, Pencil } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { confirmAction } from "@/components/confirm-dialog";
import { MilestoneTimeline } from "@/components/milestone-timeline";
import { CdeNumber } from "@/components/cde/cde-button";
import { todoSchema, TODO_STATUSES, unansweredTodoQuestions, type PersonalTodo, type TodoMessage } from "@/lib/personal-todos";
import { uploadTodoImages } from "./data";

type Person = { id: string; full_name: string };
export function TodoDialog({ task, userId, users, messages, onClose }: { task: PersonalTodo | null; userId: string; users: Person[]; messages: TodoMessage[]; onClose: () => void }) {
  const qc = useQueryClient();
  const owner = !task || task.owner_id === userId;
  const active = !task || !["concluido", "excluido"].includes(task.status);
  const [editing, setEditing] = useState(!task);
  const [shared, setShared] = useState(task?.shared_user_ids ?? []);
  const [person, setPerson] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [fileKey, setFileKey] = useState(0);
  const [mode, setMode] = useState("question");
  const [text, setText] = useState("");
  const [recipient, setRecipient] = useState("");
  const [reply, setReply] = useState("");
  const [observation, setObservation] = useState("");
  const [preview, setPreview] = useState<{ url: string; name: string } | null>(null);
  const nameFor = (id: string) => users.find(p => p.id === id)?.full_name ?? "Usuário";
  const refresh = async () => { await Promise.all([qc.invalidateQueries({ queryKey: ["personal-todos"] }), qc.invalidateQueries({ queryKey: ["todo-details"] }), qc.invalidateQueries({ queryKey: ["pending-actions"] })]); };
  const details = useQuery({ queryKey: ["todo-details", task?.id], enabled: Boolean(task), queryFn: async () => {
    if (!task) return { logs: [], attachments: [] };
    const [logs, attachments] = await Promise.all([supabase.from("personal_todo_logs").select("*").eq("todo_id", task.id).order("created_at"), supabase.from("personal_todo_attachments").select("*").eq("todo_id", task.id).order("created_at")]);
    if (logs.error) throw logs.error; if (attachments.error) throw attachments.error;
    return { logs: logs.data ?? [], attachments: attachments.data ?? [] };
  } });
  const save = useMutation({ mutationFn: async (form: HTMLFormElement) => {
    const data = new FormData(form);
    const values = todoSchema.parse({ title: data.get("title"), description: data.get("description"), task_type: data.get("task_type"), priority: data.get("priority"), urgency: data.get("urgency"), expected_result: data.get("expected_result"), proposed_solution: data.get("proposed_solution"), due_date: data.get("due_date") || null, shared_user_ids: shared });
    if (files.some(f => !f.type.startsWith("image/") || f.size > 10 * 1024 * 1024)) throw new Error("Selecione imagens de até 10 MB.");
    const result = task ? await supabase.from("personal_todos").update(values).eq("id", task.id).select("id").single() : await supabase.from("personal_todos").insert({ ...values, owner_id: userId }).select("id").single();
    if (result.error) throw result.error;
    try { await uploadTodoImages(result.data.id, userId, files); } catch { toast.error("Tarefa salva, mas alguns anexos não foram enviados. Abra a tarefa para tentar novamente."); }
  }, onSuccess: async () => { await refresh(); toast.success("Tarefa salva"); onClose(); }, onError: () => toast.error("Não foi possível salvar. Confira os campos e tente novamente.") });
  const status = useMutation({ mutationFn: async (value: string) => {
    if (!task) return;
    if (value === "excluido" && !await confirmAction(`Excluir a tarefa “${task.title}”? Ela será preservada no histórico.`, { title: "Excluir tarefa" })) return;
    const result = await supabase.from("personal_todos").update({ status: value }).eq("id", task.id).select("id").single();
    if (result.error) throw result.error;
  }, onSuccess: refresh, onError: () => toast.error("Não foi possível alterar a situação.") });
  const taskMessages = messages.filter(m => m.todo_id === task?.id);
  const questions = taskMessages.filter(m => m.message_type === "question");
  const unanswered = unansweredTodoQuestions(taskMessages);
  const pending = unanswered.filter(q => q.recipient_id === userId);
  const answering = mode === "answer" && pending.length > 0;
  const participants = users.filter(p => p.id !== userId && (p.id === task?.owner_id || shared.includes(p.id)));
  const send = useMutation({ mutationFn: async (kind: "conversation" | "observation") => {
    if (!task) return;
    const value = (kind === "observation" ? observation : text).trim();
    if (!value && !files.length) throw new Error("Digite uma mensagem.");
    let messageId: string | undefined;
    if (value) {
      const parent = answering ? pending.find(q => q.id === reply) ?? pending[0] : undefined;
      const result = await supabase.from("personal_todo_messages").insert({ todo_id: task.id, author_id: userId, message_type: kind === "observation" ? "observation" : answering ? "answer" : "question", message: value, parent_message_id: kind === "conversation" ? parent?.id ?? null : null, recipient_id: kind === "conversation" && !answering ? recipient || null : null }).select("id").single();
      if (result.error) throw result.error; messageId = result.data.id;
    }
    try { await uploadTodoImages(task.id, userId, files, messageId); } catch { toast.error("Mensagem salva, mas alguns anexos não foram enviados."); }
  }, onSuccess: async () => { setText(""); setObservation(""); setFiles([]); setFileKey(k => k + 1); await refresh(); toast.success("Registro salvo"); }, onError: () => toast.error("Não foi possível enviar. Confira o destinatário e a pergunta.") });
  async function openImage(path: string, name: string) { const r = await supabase.storage.from("personal-todo-attachments").createSignedUrl(path, 300); if (r.error) return toast.error("Não foi possível abrir a imagem."); setPreview({ url: r.data.signedUrl, name }); }
  const attachments = (messageId: string | null) => <div className="flex flex-wrap gap-2">{details.data?.attachments.filter(a => a.message_id === messageId).map(a => <span key={a.id} className="flex items-center gap-1"><Button variant="ghost" size="sm" onClick={() => openImage(a.storage_path, a.file_name)}><Paperclip className="size-4" /><span className="max-w-48 truncate">{a.file_name}</span></Button>{active && a.uploaded_by === userId && <Button variant="ghost" size="compactIcon" title="Excluir anexo" aria-label="Excluir anexo" onClick={async () => { if (!await confirmAction(`Excluir o anexo “${a.file_name}”?`)) return; const r = await supabase.from("personal_todo_attachments").delete().eq("id", a.id); if (r.error) return toast.error("Não foi possível excluir."); await supabase.storage.from("personal-todo-attachments").remove([a.storage_path]); await refresh(); }}><Trash2 /></Button>}</span>)}</div>;
  return <><Dialog open onOpenChange={open => { if (!open) onClose(); }}><DialogContent className="!min-w-0 !w-[calc(100vw-1.5rem)] !max-w-2xl max-h-[90vh] overflow-x-hidden overflow-y-auto [&>*]:min-w-0 [&_p]:break-words [&_p]:[overflow-wrap:anywhere]"><DialogHeader><DialogTitle className="break-words">{task ? `${task.todo_number} — ${task.title}` : "Novo To Do"}</DialogTitle></DialogHeader>
    {editing && owner ? <form className="space-y-4" onSubmit={e => { e.preventDefault(); save.mutate(e.currentTarget); }}>
      <div className="grid gap-4 sm:grid-cols-2"><FieldSelect name="task_type" label="Tipo" value={task?.task_type ?? "tarefa"} options={{ tarefa: "Tarefa", melhoria: "Melhoria", bug: "Bug" }} />
      <div><Label htmlFor="todo-due">Conclusão prevista</Label><Input id="todo-due" name="due_date" type="date" defaultValue={task?.due_date ?? ""} /></div>
      <div className="sm:col-span-2"><Label htmlFor="todo-title">Título</Label><Input id="todo-title" name="title" required minLength={3} maxLength={120} defaultValue={task?.title} /></div>
      <div className="sm:col-span-2"><Label htmlFor="todo-description">Descrição</Label><Textarea id="todo-description" name="description" required minLength={10} maxLength={4000} defaultValue={task?.description} className="min-h-28" /></div>
      <FieldSelect name="priority" label="Prioridade" value={task?.priority ?? "media"} options={{ baixa: "Baixa", media: "Média", alta: "Alta", critica: "Crítica" }} /><FieldSelect name="urgency" label="Urgência" value={task?.urgency ?? "normal"} options={{ normal: "Normal", urgente: "Urgente" }} />
      <div className="sm:col-span-2"><Label htmlFor="todo-result">Resultado esperado</Label><Textarea id="todo-result" name="expected_result" maxLength={2000} defaultValue={task?.expected_result} /></div>
      <div className="sm:col-span-2"><Label htmlFor="todo-solution">Solução proposta</Label><Textarea id="todo-solution" name="proposed_solution" maxLength={4000} defaultValue={task?.proposed_solution} /></div></div>
      <Label>Compartilhar com</Label><div className="flex items-center gap-2"><SearchableSelect aria-label="Compartilhar com" value={person} onChange={setPerson} options={users.filter(p => p.id !== userId && !shared.includes(p.id)).map(p => ({ value: p.id, label: p.full_name }))} placeholder="Buscar usuário" /><Button type="button" variant="ghost" size="compactIcon" aria-label="Adicionar participante" title="Adicionar participante" disabled={!person} onClick={() => { setShared(s => [...s, person]); setPerson(""); }}><Plus /></Button></div>
      {shared.map(id => <div key={id} className="flex items-center justify-between text-sm"><span>{nameFor(id)}</span><Button type="button" variant="ghost" size="compactIcon" aria-label={`Remover ${nameFor(id)}`} title="Remover participante" onClick={async () => { if (await confirmAction(`Remover ${nameFor(id)} do compartilhamento?`)) setShared(s => s.filter(p => p !== id)); }}><Trash2 /></Button></div>)}
      <Label htmlFor="todo-files">Prints e fotos (até 10 MB por imagem)</Label><Input id="todo-files" type="file" accept="image/*" multiple onChange={e => setFiles(Array.from(e.target.files ?? []))} />
      <div className="flex justify-end gap-2">{task && <Button type="button" variant="outline" onClick={() => setEditing(false)}>Cancelar</Button>}<Button type="submit" disabled={save.isPending}>{save.isPending ? "Salvando..." : "Salvar"}</Button></div>
    </form> : task && <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-xs text-muted-foreground">{nameFor(task.owner_id)} · {new Date(task.created_at).toLocaleString("pt-BR")}</span>{owner && active && <Button variant="ghost" size="compactIcon" title="Editar tarefa" aria-label="Editar tarefa" onClick={() => setEditing(true)}><Pencil /></Button>}</div>
      <p className="text-sm">{TODO_STATUSES[task.status]} · Prioridade {task.priority} · {task.urgency === "urgente" ? "Urgente" : "Normal"}</p>
      <p className="text-sm">Conclusão prevista: {task.due_date ? task.due_date.split("-").reverse().join("/") : "Não informada"}{task.completed_at && ` · Concluída em ${new Date(task.completed_at).toLocaleString("pt-BR")}`}</p>
      <div className="grid gap-4 sm:grid-cols-2">{[["Descrição", task.description], ["Resultado esperado", task.expected_result], ["Solução proposta", task.proposed_solution]].map(([label, value]) => <div key={label}><p className="text-xs text-muted-foreground">{label}</p><p className="whitespace-pre-wrap break-words text-sm">{value || "—"}</p></div>)}</div>
      {shared.length > 0 && <p className="text-xs text-muted-foreground">Compartilhada com: {shared.map(nameFor).join(", ")}</p>}{attachments(null)}
      {owner && task.status !== "excluido" && <div className="flex flex-wrap items-end gap-2"><div className="min-w-40 flex-1"><Label>Situação</Label><Select value={task.status} onValueChange={value => status.mutate(value)} disabled={status.isPending}><SelectTrigger aria-label="Situação da tarefa"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(TODO_STATUSES).filter(([key]) => key !== "excluido").map(([key, value]) => <SelectItem key={key} value={key}>{value}</SelectItem>)}</SelectContent></Select></div><Button variant="ghost" size="compactIcon" title="Excluir tarefa" aria-label="Excluir tarefa" onClick={() => status.mutate("excluido")}><Trash2 /></Button></div>}
      <section className="space-y-3 border-t border-border pt-4"><h3 className="text-sm font-semibold">Conversa</h3>{questions.flatMap((q, i) => [q, ...taskMessages.filter(a => a.parent_message_id === q.id)].map(m => <div key={m.id} className={`rounded-md border border-border p-3 text-sm ${m.message_type === "answer" ? "ml-6 bg-primary/10" : "bg-muted/50"}`}><div className="flex flex-wrap items-center gap-2"><CdeNumber subcategory>{i + 1}</CdeNumber><span>{m.message_type === "question" ? "Pergunta" : "Resposta"} · {nameFor(m.author_id)}</span><span className="text-xs text-muted-foreground">{new Date(m.created_at).toLocaleString("pt-BR")}</span></div><p className="mt-2 whitespace-pre-wrap break-words">{m.message}</p>{m.message_type === "question" && <p className="text-xs text-muted-foreground">Para: {nameFor(m.recipient_id ?? "")}</p>}{unanswered.some(u => u.id === m.id) && <p className="text-xs text-destructive">Aguardando resposta</p>}{attachments(m.id)}</div>))}
      {active && <div className="space-y-2">{pending.length > 0 && <div className="flex gap-2"><Button size="sm" variant={mode === "answer" ? "default" : "outline"} onClick={() => setMode("answer")}>Responder</Button><Button size="sm" variant={mode === "question" ? "default" : "outline"} onClick={() => setMode("question")}>Nova pergunta</Button></div>}
      {answering ? <Select value={reply || pending[0]?.id} onValueChange={setReply}><SelectTrigger aria-label="Responder à pergunta"><SelectValue /></SelectTrigger><SelectContent>{pending.map(q => <SelectItem key={q.id} value={q.id}>{q.message}</SelectItem>)}</SelectContent></Select> : <SearchableSelect aria-label="Destinatário da pergunta" value={recipient} onChange={setRecipient} options={participants.map(p => ({ value: p.id, label: p.full_name }))} placeholder="Destinatário da pergunta" />}
      <Label htmlFor="todo-message">{answering ? "Resposta" : "Nova pergunta"}</Label><Textarea id="todo-message" value={text} onChange={e => setText(e.target.value)} maxLength={4000} />
      <Label htmlFor="todo-message-files">Prints e fotos</Label><Input key={fileKey} id="todo-message-files" type="file" accept="image/*" multiple onChange={e => setFiles(Array.from(e.target.files ?? []))} />
      <div className="flex justify-end"><Button title={answering ? "Enviar resposta" : "Enviar pergunta"} aria-label={answering ? "Enviar resposta" : "Enviar pergunta"} disabled={send.isPending || (!text.trim() && !files.length) || (Boolean(text.trim()) && !answering && !recipient)} onClick={() => send.mutate("conversation")}><Send /></Button></div></div>}</section>
      <section className="space-y-3 border-t border-border pt-4"><h3 className="text-sm font-semibold">Observações</h3>{taskMessages.filter(m => m.message_type === "observation").map(m => <div key={m.id}><p className="whitespace-pre-wrap break-words text-sm">{m.message}</p><p className="text-xs text-muted-foreground">{nameFor(m.author_id)} · {new Date(m.created_at).toLocaleString("pt-BR")}</p>{attachments(m.id)}</div>)}{active && <><Label htmlFor="todo-observation">Nova observação</Label><Textarea id="todo-observation" value={observation} onChange={e => setObservation(e.target.value)} maxLength={4000} /><div className="flex justify-end"><Button disabled={!observation.trim() || send.isPending} onClick={() => send.mutate("observation")}>Salvar observação</Button></div></>}</section>
      <section className="space-y-3 border-t border-border pt-4"><h3 className="flex items-center gap-2 text-sm font-semibold"><History className="size-4" />Histórico</h3><MilestoneTimeline entries={(details.data?.logs ?? []).map(l => ({ id: l.id, created_at: l.created_at, text: `${l.text}\npor ${nameFor(l.actor_id)}` }))} /></section>
    </div>}
  </DialogContent></Dialog><Dialog open={Boolean(preview)} onOpenChange={open => { if (!open) setPreview(null); }}><DialogContent className="max-w-4xl"><DialogHeader><DialogTitle>{preview?.name}</DialogTitle></DialogHeader>{preview && <img src={preview.url} alt={preview.name} className="max-h-[70vh] w-full object-contain" />}</DialogContent></Dialog></>;
}
function FieldSelect({ name, label, value, options }: { name: string; label: string; value: string; options: Record<string, string> }) { return <div><Label>{label}</Label><Select name={name} defaultValue={value}><SelectTrigger aria-label={label}><SelectValue /></SelectTrigger><SelectContent>{Object.entries(options).map(([key, text]) => <SelectItem key={key} value={key}>{text}</SelectItem>)}</SelectContent></Select></div>; }