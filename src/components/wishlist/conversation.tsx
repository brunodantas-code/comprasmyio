import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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

type Person = { id: string; full_name: string };
export function WishlistConversation({ idea, messages, users, userId }: { idea: WishlistIdea; messages: WishlistMessage[]; users: Person[]; userId: string }) {
  const qc = useQueryClient();
  const [mode, setMode] = useState<"question" | "answer" | "contribution">("question");
  const [recipient, setRecipient] = useState(idea.idealizer_id !== userId ? idea.idealizer_id : "");
  const [replyId, setReplyId] = useState("");
  const [text, setText] = useState("");
  const ownMessages = messages.filter(m => m.idea_id === idea.id);
  const pending = unansweredWishlistQuestions(ownMessages);
  const forMe = pending.filter(q => canAnswerWishlistQuestion(q, userId, ownMessages));
  const answering = mode === "answer" && forMe.length > 0;
  const selectedReply = forMe.find(q => q.id === replyId) ?? forMe[0];
  const name = (id: string | null) => users.find(u => u.id === id)?.full_name || "Usuário";
  const send = useMutation({
    mutationFn: async () => {
      if (mode === "answer" && !answering) throw new Error("A pergunta já foi respondida. Atualize a conversa.");
      const input = wishlistMessageSchema.parse({ idea_id: idea.id, message_type: mode, message: text, recipient_id: mode === "question" ? recipient || null : null, parent_message_id: answering ? selectedReply?.id ?? null : null });
      if (mode === "question" && !input.recipient_id) throw new Error("Selecione o destinatário.");
      const result = await supabase.from("wishlist_messages").insert({ ...input, author_id: userId }).select("id").single();
      if (result.error) throw result.error;
    },
    onSuccess: async () => { setText(""); await Promise.all([qc.invalidateQueries({ queryKey: ["wishlist"] }), qc.invalidateQueries({ queryKey: ["wishlist-logs", idea.id] })]); toast.success("Mensagem enviada"); },
    onError: (error: Error) => toast.error(error.message),
  });
  const label = answering ? "Resposta" : mode === "contribution" ? "Contribuição à ideia" : "Nova pergunta";
  const renderMessage = (message: WishlistMessage, index: number) => (
    <article key={message.id} className={`min-w-0 rounded-md border border-border p-3 ${message.message_type === "answer" ? "ml-3 bg-cde-number-soft sm:ml-8" : "bg-muted/50"}`}>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <CdeNumber subcategory screen="components/wishlist/conversation.tsx">{index + 1}</CdeNumber>
        <span>{message.message_type === "question" ? "Pergunta" : message.message_type === "answer" ? "Resposta" : "Contribuição"} · {name(message.author_id)}</span>
        <time className="text-xs text-muted-foreground">{new Date(message.created_at).toLocaleString("pt-BR")}</time>
      </div>
      <p className="mt-2 whitespace-pre-wrap break-words text-sm [overflow-wrap:anywhere]">{message.message}</p>
      {message.message_type === "question" && <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>Para: {name(message.recipient_id)}{pending.some(q => q.id === message.id) ? " · Aguardando resposta" : " · Respondida"}</span>
        {canAnswerWishlistQuestion(message, userId, ownMessages) && <Button variant="ghost" size="sm" onClick={() => { setMode("answer"); setReplyId(message.id); }}>Responder</Button>}
      </div>}
    </article>
  );
  return <section className="space-y-4 border-t border-border pt-4" aria-labelledby="wishlist-conversation">
    <h3 id="wishlist-conversation" className="text-sm font-semibold">Conversa e contribuições</h3>
    <div className="space-y-3">
      {ownMessages.filter(m => !m.parent_message_id).map((message, index) => <div key={message.id} className="space-y-2">{renderMessage(message, index)}{ownMessages.filter(m => m.parent_message_id === message.id).map(m => renderMessage(m, index))}</div>)}
      {!ownMessages.length && <p className="text-sm text-muted-foreground">Nenhuma conversa registrada.</p>}
    </div>
    <div className="flex flex-wrap gap-2" role="group" aria-label="Tipo de mensagem">
      {forMe.length > 0 && <Button variant={answering ? "secondary" : "ghost"} size="sm" onClick={() => setMode("answer")}>Responder</Button>}
      <Button variant={mode === "question" ? "secondary" : "ghost"} size="sm" onClick={() => setMode("question")}>Nova pergunta</Button>
      <Button variant={mode === "contribution" ? "secondary" : "ghost"} size="sm" onClick={() => setMode("contribution")}>Contribuir com a ideia</Button>
    </div>
    {answering ? <div className="space-y-1"><Label>Pergunta a responder</Label><Select value={selectedReply?.id ?? ""} onValueChange={setReplyId}><SelectTrigger aria-label="Pergunta a responder" className="w-full min-w-0"><SelectValue /></SelectTrigger><SelectContent>{forMe.map(q => <SelectItem key={q.id} value={q.id}>{q.message}</SelectItem>)}</SelectContent></Select></div>
      : mode === "question" ? <div className="space-y-1"><Label>Destinatário da pergunta</Label><SearchableSelect aria-label="Destinatário da pergunta" value={recipient} onChange={setRecipient} placeholder="Selecionar usuário" options={users.filter(u => u.id !== userId).map(u => ({ value: u.id, label: u.full_name }))} /></div> : null}
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2"><Label htmlFor="wishlist-message">{label}</Label><Button variant="ghost" size="compactIcon" disabled={send.isPending || !text.trim() || (mode === "question" && !recipient)} title={answering ? "Enviar resposta" : mode === "contribution" ? "Enviar contribuição" : "Enviar pergunta"} aria-label={answering ? "Enviar resposta" : mode === "contribution" ? "Enviar contribuição" : "Enviar pergunta"} onClick={() => send.mutate()}><Send /></Button></div>
      <Textarea id="wishlist-message" value={text} maxLength={6000} onChange={event => setText(event.target.value)} className="min-h-24" />
    </div>
  </section>;
}