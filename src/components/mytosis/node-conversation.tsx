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
import { QuestionRecipient } from "./question-recipient";
import { MessageAttachmentField, MessageAttachmentList, uploadMessageAttachments, type MessageAttachmentRow } from "@/components/message-attachments";
import { messageTextForSend } from "@/components/message-attachment-rules";

const MYTOSIS_ATTACHMENT_BUCKET = "mytosis-attachments";
type MytosisAttachment = MessageAttachmentRow & { url?: string };

export function NodeConversation({ nodeId, data }: { nodeId: string; data: MytosisData }) {
  const client = useQueryClient();
  const [text, setText] = useState("");
  const [replyId, setReplyId] = useState("");
  const [recipientId, setRecipientId] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  useEffect(() => { setText(""); setReplyId(""); setRecipientId(""); setEditId(null); setFiles([]); }, [nodeId]);
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
  const attachments = useQuery({
    queryKey: ["mytosis-node-message-attachments", nodeId], refetchInterval: 15000,
    queryFn: async () => {
      const result = await supabase.from("mytosis_node_attachments").select("*").eq("node_id", nodeId).order("created_at");
      if (result.error) throw result.error;
      return Promise.all((result.data ?? []).map(async (file) => {
        const signed = await supabase.storage.from(MYTOSIS_ATTACHMENT_BUCKET).createSignedUrl(file.storage_path, 600, { download: file.file_name });
        return { ...file, url: signed.data?.signedUrl } as MytosisAttachment;
      }));
    },
  });
  const refresh = () => Promise.all([client.invalidateQueries({ queryKey: ["mytosis-node-conversation", nodeId] }), client.invalidateQueries({ queryKey: ["mytosis-node-message-attachments", nodeId] }), client.invalidateQueries({ queryKey: ["pending-actions"] })]);
  const messages = details.data?.messages ?? [];
  const questions = messages.filter((message) => message.kind === "question");
  const pending = pendingOkrQuestions(messages, nodeId, data.userId);
  useEffect(() => { if (replyId && details.data && !pending.some((q) => q.id === replyId)) setReplyId(""); }, [replyId, details.data]);
  const send = useMutation({
    mutationFn: async () => {
      if (!details.data?.canConverse || (!text.trim() && !files.length)) throw new Error("Escreva a mensagem ou anexe um arquivo.");
      if (replyId && !pending.some((q) => q.id === replyId)) throw new Error("Esta mensagem já foi respondida.");
      if (!replyId && !recipientId) throw new Error("Escolha o destinatário da mensagem.");
      const inserted = await supabase.from("mytosis_node_messages").insert({ node_id: nodeId, author_id: data.userId, text: messageTextForSend(text), kind: replyId ? "answer" : "question", reply_to_id: replyId || null, recipient_id: replyId ? null : recipientId }).select("id").single();
      if (inserted.error) throw inserted.error;
      if (files.length) await uploadMessageAttachments({
        bucket: MYTOSIS_ATTACHMENT_BUCKET,
        files,
        pathFor: (_file, safeName) => `${data.userId}/${nodeId}/${crypto.randomUUID()}-${safeName}`,
        insert: (file, path) => supabase.from("mytosis_node_attachments").insert({ node_id: nodeId, message_id: inserted.data.id, uploaded_by: data.userId, file_name: file.name.slice(0, 255), storage_path: path, content_type: file.type || "application/octet-stream", file_size: file.size }).select("id").single(),
      });
    },
    onSuccess: async () => { setText(""); setReplyId(""); setRecipientId(""); setFiles([]); await refresh(); }, onError: (error: Error) => toast.error(error.message),
  });
  const edit = useMutation({
    mutationFn: async () => {
      if (!editId || !editText.trim()) throw new Error("Informe o texto.");
      const { error } = await supabase.from("mytosis_node_messages").update({ text: editText.trim() }).eq("id", editId);
      if (error) throw error;
    }, onSuccess: async () => { setEditId(null); await refresh(); }, onError: (error: Error) => toast.error(error.message),
  });
  const person = (id: string | null) => data.users.find((user) => user.id === id)?.full_name ?? "Usuário";
  const openAttachment = (attachment: MessageAttachmentRow) => {
    const url = (attachment as MytosisAttachment).url;
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  };
  const renderMessage = (message: typeof messages[number], number: number) => <div key={message.id} className={cn("rounded-md border p-3", message.kind === "answer" ? "ml-4 border-primary/40 bg-primary/10" : "border-border bg-muted/40")}>
    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground"><span>{message.kind === "question" ? "Mensagem" : "Resposta"} {number} · {person(message.author_id)}{message.recipient_id ? ` → ${person(message.recipient_id)}` : ""}</span><span className="flex items-center gap-2">{new Date(message.created_at).toLocaleString("pt-BR")}{message.author_id === data.userId && details.data?.canConverse ? <Button variant="outline" size="icon" className="h-6 w-6" aria-label="Editar mensagem" title="Editar mensagem" onClick={() => { setEditId(message.id); setEditText(message.text); }}><Pencil className="h-3.5 w-3.5" /></Button> : null}</span></div>
    {editId === message.id ? <div className="mt-2 space-y-2"><ChecklistText label="Editar mensagem" value={editText} onChange={setEditText} maxLength={4000} multiline /><div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setEditId(null)}>Cancelar</Button><Button variant="outline" disabled={edit.isPending} onClick={() => edit.mutate()}>Salvar</Button></div></div> : <p className="mt-2 whitespace-pre-wrap break-words text-sm">{message.text}</p>}
    <MessageAttachmentList bucket={MYTOSIS_ATTACHMENT_BUCKET} attachments={(attachments.data ?? []).filter((a) => a.message_id === message.id)} onOpen={openAttachment} />
  </div>;
  return <div className="space-y-4">
    <section className="space-y-3 border-t border-border pt-4"><h3 className="flex items-center gap-2 text-sm font-normal"><MessageCircleQuestion className="h-4 w-4" />Mensagens</h3>
      {details.isLoading ? <p className="text-sm text-muted-foreground">Carregando...</p> : null}
      {details.error ? <p role="alert" className="text-sm text-destructive">Não foi possível carregar a conversa. {details.error.message}</p> : null}
      {questions.map((question, index) => <div key={question.id} className="space-y-2">{renderMessage(question, index + 1)}{messages.filter((answer) => answer.reply_to_id === question.id).map((answer) => renderMessage(answer, index + 1))}</div>)}
      {details.data?.canConverse ? <div className="space-y-2">{pending.length ? <SearchableSelect value={replyId} onChange={setReplyId} placeholder="Nova mensagem" options={[{ value: "", label: "Nova mensagem" }, ...pending.map((question) => ({ value: question.id, label: `Responder à mensagem ${questions.findIndex((q) => q.id === question.id) + 1}: ${question.text}` }))]} /> : null}{!replyId ? <QuestionRecipient nodeId={nodeId} value={recipientId} onChange={setRecipientId} /> : null}<ChecklistText label={replyId ? "Resposta" : "Nova mensagem"} hint={replyId ? "Escreva a resposta" : "Escreva uma mensagem"} value={text} onChange={setText} maxLength={4000} multiline /><MessageAttachmentField id={`mytosis-node-files-${nodeId}`} files={files} onChange={setFiles} /><div className="flex justify-end"><Button variant="outline" disabled={send.isPending || (!text.trim() && !files.length) || (!replyId && !recipientId)} onClick={() => send.mutate()}><Send className="h-4 w-4" />{replyId ? "Enviar resposta" : "Enviar mensagem"}</Button></div></div> : null}
    </section>
    <section className="space-y-3 border-t border-border pt-4"><h3 className="flex items-center gap-2 text-sm font-normal"><History className="h-4 w-4" />Histórico</h3><MilestoneTimeline entries={(details.data?.logs ?? []).map((log) => ({ id: log.id, created_at: log.created_at, text: `${log.text}\npor ${person(log.actor_id)}` }))} /></section>
  </div>;
}
