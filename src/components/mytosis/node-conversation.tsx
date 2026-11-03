import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { History, MessageCircleQuestion, Pencil, Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { MilestoneTimeline } from "@/components/milestone-timeline";
import { pendingOkrQuestions } from "@/lib/mytosis-conversation";
import { cn } from "@/lib/utils";
import { ChecklistText } from "./checklist-text";
import type { MytosisData } from "./use-mytosis";

export function NodeConversation({ nodeId, data }: { nodeId: string; data: MytosisData }) {
  const client = useQueryClient();
  const [text, setText] = useState("");
  const [replyId, setReplyId] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  useEffect(() => { setText(""); setReplyId(""); setEditId(null); }, [nodeId]);
  const details = useQuery({
    queryKey: ["mytosis-node-conversation", nodeId], refetchInterval: 15000,
    queryFn: async () => {
      const [messages, logs, access] = await Promise.all([
        supabase.from("mytosis_node_messages").select("*").eq("node_id", nodeId).order("created_at"),
        supabase.from("mytosis_node_logs").select("*").eq("node_id", nodeId).order("created_at"),
        supabase.rpc("mytosis_node_can_converse", { _node_id: nodeId, _user_id: data.userId }),
      ]);
      if (messages.error) throw messages.error;
      if (logs.error) throw logs.error;
      if (access.error) throw access.error;
      return { messages: messages.data, logs: logs.data, canConverse: access.data };
    },
  });
  const refresh = () => client.invalidateQueries({ queryKey: ["mytosis-node-conversation", nodeId] });
  const messages = details.data?.messages ?? [];
  const questions = messages.filter((message) => message.kind === "question");
  const pending = pendingOkrQuestions(messages, nodeId, data.userId);
  useEffect(() => { if (replyId && details.data && !pending.some((q) => q.id === replyId)) setReplyId(""); }, [replyId, details.data]);
  const send = useMutation({
    mutationFn: async () => {
      if (!details.data?.canConverse || !text.trim()) throw new Error("Escreva a pergunta ou resposta.");
      if (replyId && !pending.some((q) => q.id === replyId)) throw new Error("Esta pergunta já foi respondida.");
      const { error } = await supabase.from("mytosis_node_messages").insert({ node_id: nodeId, author_id: data.userId, text: text.trim(), kind: replyId ? "answer" : "question", reply_to_id: replyId || null });
      if (error) throw error;
    },
    onSuccess: async () => { setText(""); setReplyId(""); await refresh(); }, onError: (error: Error) => toast.error(error.message),
  });
  const edit = useMutation({
    mutationFn: async () => {
      if (!editId || !editText.trim()) throw new Error("Informe o texto.");
      const { error } = await supabase.from("mytosis_node_messages").update({ text: editText.trim() }).eq("id", editId);
      if (error) throw error;
    }, onSuccess: async () => { setEditId(null); await refresh(); }, onError: (error: Error) => toast.error(error.message),
  });
  const person = (id: string | null) => data.users.find((user) => user.id === id)?.full_name ?? "Usuário";
  const renderMessage = (message: typeof messages[number], number: number) => <div key={message.id} className={cn("rounded-md border p-3", message.kind === "answer" ? "ml-4 border-primary/40 bg-primary/10" : "border-border bg-muted/40")}>
    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground"><span>{message.kind === "question" ? "Pergunta" : "Resposta"} {number} · {person(message.author_id)}</span><span className="flex items-center gap-2">{new Date(message.created_at).toLocaleString("pt-BR")}{message.author_id === data.userId && details.data?.canConverse ? <Button variant="outline" size="icon" className="h-6 w-6" aria-label="Editar mensagem" title="Editar mensagem" onClick={() => { setEditId(message.id); setEditText(message.text); }}><Pencil className="h-3.5 w-3.5" /></Button> : null}</span></div>
    {editId === message.id ? <div className="mt-2 space-y-2"><ChecklistText label="Editar mensagem" value={editText} onChange={setEditText} maxLength={4000} multiline /><div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setEditId(null)}>Cancelar</Button><Button variant="outline" disabled={edit.isPending} onClick={() => edit.mutate()}>Salvar</Button></div></div> : <p className="mt-2 whitespace-pre-wrap break-words text-sm">{message.text}</p>}
  </div>;
  return <div className="space-y-4">
    <section className="space-y-3 border-t border-border pt-4"><h3 className="flex items-center gap-2 text-sm font-normal"><MessageCircleQuestion className="h-4 w-4" />Conversa</h3>
      {details.isLoading ? <p className="text-sm text-muted-foreground">Carregando...</p> : null}
      {details.error ? <p role="alert" className="text-sm text-destructive">Não foi possível carregar a conversa. {details.error.message}</p> : null}
      {questions.map((question, index) => <div key={question.id} className="space-y-2">{renderMessage(question, index + 1)}{messages.filter((answer) => answer.reply_to_id === question.id).map((answer) => renderMessage(answer, index + 1))}</div>)}
      {details.data?.canConverse ? <div className="space-y-2">{pending.length ? <SearchableSelect value={replyId} onChange={setReplyId} placeholder="Nova pergunta" options={[{ value: "", label: "Nova pergunta" }, ...pending.map((question) => ({ value: question.id, label: `Responder à pergunta ${questions.findIndex((q) => q.id === question.id) + 1}: ${question.text}` }))]} /> : null}<ChecklistText label={replyId ? "Resposta" : "Nova pergunta"} hint={replyId ? "Escreva a resposta" : "Escreva uma pergunta"} value={text} onChange={setText} maxLength={4000} multiline /><div className="flex justify-end"><Button variant="outline" disabled={send.isPending || !text.trim()} onClick={() => send.mutate()}><Send className="h-4 w-4" />{replyId ? "Enviar resposta" : "Enviar pergunta"}</Button></div></div> : null}
    </section>
    <section className="space-y-3 border-t border-border pt-4"><h3 className="flex items-center gap-2 text-sm font-normal"><History className="h-4 w-4" />Histórico</h3><MilestoneTimeline entries={(details.data?.logs ?? []).map((log) => ({ id: log.id, created_at: log.created_at, text: `${log.text}\npor ${person(log.actor_id)}` }))} /></section>
  </div>;
}