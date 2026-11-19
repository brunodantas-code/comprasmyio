import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CdeNumber } from "@/components/cde/cde-button";
import { canAnswerWishlistQuestion, unansweredWishlistQuestions, wishlistMessageSchema, type WishlistIdea, type WishlistMessage } from "@/lib/wishlist";
import { MessageAttachmentField, MessageAttachmentList, uploadMessageAttachments, type MessageAttachmentRow } from "@/components/message-attachments";
import { messageTextForSend } from "@/components/message-attachment-rules";

const WISHLIST_ATTACHMENT_BUCKET = "wishlist-attachments";
type WishlistAttachment = MessageAttachmentRow & { url?: string };

type Person = { id: string; full_name: string };
export function WishlistConversation({ idea, messages, users, userId }: { idea: WishlistIdea; messages: WishlistMessage[]; users: Person[]; userId: string }) {
  const qc = useQueryClient();
  const [mode, setMode] = useState<"question" | "answer" | "contribution">("question");
  const [recipient, setRecipient] = useState(idea.idealizer_id !== userId ? idea.idealizer_id : "");
  const [replyId, setReplyId] = useState("");
  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const attachments = useQuery({
    queryKey: ["wishlist-message-attachments", idea.id],
    queryFn: async () => {
      const result = await supabase.from("wishlist_attachments").select("*").eq("idea_id", idea.id).order("created_at");
      if (result.error) throw result.error;
      return Promise.all((result.data ?? []).map(async (file) => {
        const signed = await supabase.storage.from(WISHLIST_ATTACHMENT_BUCKET).createSignedUrl(file.storage_path, 600, { download: file.file_name });
        return { ...file, url: signed.data?.signedUrl } as WishlistAttachment;
      }));
    },
  });
  const ownMessages = messages.filter(m => m.idea_id === idea.id);
  const pending = unansweredWishlistQuestions(ownMessages);
  const forMe = pending.filter(q => canAnswerWishlistQuestion(q, userId, ownMessages));
  const answering = mode === "answer" && forMe.length > 0;
  const selectedReply = forMe.find(q => q.id === replyId) ?? forMe[0];
  const name = (id: string | null) => users.find(u => u.id === id)?.full_name || "Usuário";
  const send = useMutation({
    mutationFn: async () => {
      if (mode === "answer" && !answering) throw new Error("A mensagem já foi respondida. Atualize a conversa.");
      const input = wishlistMessageSchema.parse({ idea_id: idea.id, message_type: mode, message: messageTextForSend(text), recipient_id: mode === "question" ? recipient || null : null, parent_message_id: answering ? selectedReply?.id ?? null : null });
      if (mode === "question" && !input.recipient_id) throw new Error("Selecione o destinatário.");
      const result = await supabase.from("wishlist_messages").insert({ ...input, author_id: userId, message: input.message || "(arquivos anexados)" }).select("id").single();
      if (result.error) throw result.error;
      if (files.length) await uploadMessageAttachments({
        bucket: WISHLIST_ATTACHMENT_BUCKET,
        files,
        pathFor: (_file, safeName) => `${userId}/${idea.id}/${crypto.randomUUID()}-${safeName}`,
        insert: (file, path) => supabase.from("wishlist_attachments").insert({ idea_id: idea.id, message_id: result.data.id, uploaded_by: userId, file_name: file.name.slice(0, 255), storage_path: path, content_type: file.type || "application/octet-stream", file_size: file.size }).select("id").single(),
      });
    },
    onSuccess: async () => { setText(""); setFiles([]); await Promise.all([qc.invalidateQueries({ queryKey: ["wishlist"] }), qc.invalidateQueries({ queryKey: ["wishlist-logs", idea.id] }), qc.invalidateQueries({ queryKey: ["wishlist-message-attachments", idea.id] })]); toast.success("Mensagem enviada"); },
    onError: (error: Error) => toast.error(error.message),
  });
  const label = answering ? "Resposta" : mode === "contribution" ? "Contribuição à ideia" : "Nova mensagem";
  const renderMessage = (message: WishlistMessage, index: number) => (
    <article key={message.id} className={`min-w-0 rounded-md border border-border p-3 ${message.message_type === "answer" ? "ml-3 bg-cde-number-soft sm:ml-8" : "bg-muted/50"}`}>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <CdeNumber subcategory screen="components/wishlist/conversation.tsx">{index + 1}</CdeNumber>
        <span>{message.message_type === "question" ? "Mensagem" : message.message_type === "answer" ? "Resposta" : "Contribuição"} · {name(message.author_id)}</span>
        <time className="text-xs text-muted-foreground">{new Date(message.created_at).toLocaleString("pt-BR")}</time>
      </div>
      <p className="mt-2 whitespace-pre-wrap break-words text-sm [overflow-wrap:anywhere]">{message.message}</p>
      <MessageAttachmentList bucket={WISHLIST_ATTACHMENT_BUCKET} attachments={(attachments.data ?? []).filter(a => a.message_id === message.id)} onOpen={(a) => { const url = (a as WishlistAttachment).url; if (url) window.open(url, "_blank", "noopener,noreferrer"); }} />
      {message.message_type === "question" && <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>Para: {name(message.recipient_id)}{pending.some(q => q.id === message.id) ? " · Aguardando resposta" : " · Respondida"}</span>
        {canAnswerWishlistQuestion(message, userId, ownMessages) && <Button variant="ghost" size="sm" actionKind="standard" onClick={() => { setMode("answer"); setReplyId(message.id); }}>Responder</Button>}
      </div>}
    </article>
  );
  return <section className="space-y-4 border-t border-border pt-4" aria-labelledby="wishlist-conversation">
    <h3 id="wishlist-conversation" className="text-sm font-semibold">Mensagens e contribuições</h3>
    <div className="space-y-3">
      {ownMessages.filter(m => !m.parent_message_id).map((message, index) => <div key={message.id} className="space-y-2">{renderMessage(message, index)}{ownMessages.filter(m => m.parent_message_id === message.id).map(m => renderMessage(m, index))}</div>)}
      {!ownMessages.length && <p className="text-sm text-muted-foreground">Nenhuma conversa registrada.</p>}
    </div>
    <div className="flex flex-wrap gap-2" role="group" aria-label="Tipo de mensagem">
      {forMe.length > 0 && <Button variant="ghost" size="sm" actionKind="standard" aria-pressed={answering} className={answering ? "underline underline-offset-4" : undefined} onClick={() => setMode("answer")}>Responder</Button>}
      <Button variant="ghost" size="sm" actionKind="standard" aria-pressed={mode === "question"} className={mode === "question" ? "underline underline-offset-4" : undefined} onClick={() => setMode("question")}>Nova mensagem</Button>
      <Button variant={mode === "contribution" ? "secondary" : "ghost"} size="sm" onClick={() => setMode("contribution")}>Contribuir com a ideia</Button>
    </div>
    {answering ? <div className="space-y-1"><Label>Mensagem a responder</Label><Select value={selectedReply?.id ?? ""} onValueChange={setReplyId}><SelectTrigger aria-label="Mensagem a responder" className="w-full min-w-0"><SelectValue /></SelectTrigger><SelectContent>{forMe.map(q => <SelectItem key={q.id} value={q.id}>{q.message}</SelectItem>)}</SelectContent></Select></div>
      : mode === "question" ? <div className="space-y-1"><Label>Destinatário da mensagem</Label><SearchableSelect aria-label="Destinatário da mensagem" value={recipient} onChange={setRecipient} placeholder="Selecionar usuário" options={users.filter(u => u.id !== userId).map(u => ({ value: u.id, label: u.full_name }))} /></div> : null}
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2"><Label htmlFor="wishlist-message">{label}</Label><Button variant="ghost" size="compactIcon" disabled={send.isPending || (!text.trim() && !files.length) || (mode === "question" && !recipient)} title={answering ? "Enviar resposta" : mode === "contribution" ? "Enviar contribuição" : "Enviar mensagem"} aria-label={answering ? "Enviar resposta" : mode === "contribution" ? "Enviar contribuição" : "Enviar mensagem"} onClick={() => send.mutate()}><Send /></Button></div>
      <Textarea id="wishlist-message" value={text} maxLength={6000} onChange={event => setText(event.target.value)} className="min-h-24" />
      <MessageAttachmentField id="wishlist-message-files" files={files} onChange={setFiles} />
    </div>
  </section>;
}