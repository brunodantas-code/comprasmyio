import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageCircleQuestion, Send } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentUser } from '@/hooks/use-current-user';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { canAnswerSupplyQuestion, unansweredSupplyQuestions } from '@/lib/supply-conversation';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { MessageAttachmentField, MessageAttachmentList, uploadMessageAttachments, type MessageAttachmentRow } from '@/components/message-attachments';
import { messageTextForSend } from '@/components/message-attachment-rules';

const SUPPLY_ATTACHMENT_BUCKET = 'order-attachments';

type SupplyAttachment = MessageAttachmentRow & { url?: string };

export function SupplyOrderConversation({ order, nameFor = () => 'Usuário' }: { order: { id: string; requester_id: string; status: string; request_type: string }; nameFor?: (id: string) => string }) {
  const { data: me } = useCurrentUser();
  const qc = useQueryClient();
  const [mode, setMode] = useState<'question' | 'answer'>('answer');
  const [replyId, setReplyId] = useState('');
  const [text, setText] = useState('');
  const [recipient, setRecipient] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const { data: users = [] } = useQuery({ queryKey: ['supply-conversation-users', order.id], queryFn: async () => {
    const { data, error } = await supabase.rpc('supply_conversation_users', { _order_id: order.id });
    if (error) throw error;
    return data ?? [];
  } });
  const authorName = (id: string) => users.find(u => u.id === id)?.full_name ?? nameFor(id);
  const { data: messages = [], isLoading, error } = useQuery({
    queryKey: ['supply-order-messages', order.id],
    queryFn: async () => {
      const result = await supabase.from('supply_order_messages').select('*').eq('order_id', order.id).order('created_at');
      if (result.error) throw result.error;
      return result.data ?? [];
    }, refetchInterval: 15000,
  });
  const { data: attachments = [] } = useQuery({
    queryKey: ['supply-order-attachments', order.id],
    queryFn: async () => {
      const result = await supabase.from('supply_order_attachments').select('*').eq('order_id', order.id).order('created_at');
      if (result.error) throw result.error;
      return Promise.all((result.data ?? []).map(async (file) => {
        const signed = await supabase.storage.from(SUPPLY_ATTACHMENT_BUCKET).createSignedUrl(file.storage_path, 600, { download: file.file_name });
        return { ...file, url: signed.data?.signedUrl } as SupplyAttachment;
      }));
    }, refetchInterval: 15000,
  });
  const buyer = Boolean(me?.canEditSupplyPurchase);
  const writable = Boolean(me && (me.id === order.requester_id || buyer) && order.status !== 'cancelado' && order.request_type !== 'pagamento');
  const pending = unansweredSupplyQuestions(messages).filter(q => canAnswerSupplyQuestion(q, me?.id ?? '', buyer, order.requester_id));
  const answering = pending.length > 0 && mode === 'answer';
  const questions = messages.filter(m => m.message_type === 'question');
  const numbers = new Map(questions.map((q, i) => [q.id, i + 1]));
  const unanswered = new Set(unansweredSupplyQuestions(messages).map(q => q.id));
  const ordered = questions.flatMap(q => [q, ...messages.filter(m => m.parent_message_id === q.id)]);
  const attachmentsFor = (messageId: string) => attachments.filter(a => a.message_id === messageId);
  const send = useMutation({
    mutationFn: async () => {
      if (!me || !writable || (!text.trim() && !files.length)) throw new Error('Não é possível enviar esta mensagem.');
      const parent = answering ? pending.find(q => q.id === replyId) ?? pending[0] : undefined;
      if (!answering && !recipient) throw new Error('Selecione para quem enviar a mensagem.');
      const inserted = await supabase.from('supply_order_messages').insert({ order_id: order.id, author_id: me.id, recipient_id: answering ? null : recipient, message_type: answering ? 'answer' : 'question', parent_message_id: parent?.id ?? null, message: messageTextForSend(text) }).select('id').single();
      if (inserted.error) throw inserted.error;
      if (files.length) await uploadMessageAttachments({
        bucket: SUPPLY_ATTACHMENT_BUCKET,
        files,
        pathFor: (_file, safeName) => `${order.id}/${crypto.randomUUID()}-${safeName}`,
        insert: (file, path) => supabase.from('supply_order_attachments').insert({ order_id: order.id, message_id: inserted.data.id, uploaded_by: me.id, file_name: file.name, storage_path: path, content_type: file.type || 'application/octet-stream', file_size: file.size }).select('id').single(),
      });
    },
    onSuccess: () => {
      toast.success(answering ? 'Resposta enviada' : 'Mensagem enviada'); setText(''); setReplyId(''); setMode('answer'); setFiles([]);
      for (const key of ['supply-order-messages', 'supply-order-attachments', 'order-report-logs', 'order-report-related-logs', 'pending-actions', 'central-admin', 'logs']) void qc.invalidateQueries({ queryKey: [key] });
    }, onError: (e: Error) => toast.error(e.message),
  });
  return <section className="space-y-3 border-t pt-4">
    <h3 className="flex items-center gap-2 text-sm font-semibold"><MessageCircleQuestion className="h-4 w-4" />Mensagens</h3>
    {error ? <p className="text-sm text-destructive">Não foi possível carregar a conversa.</p> : isLoading ? <p className="text-sm text-muted-foreground">Carregando...</p> : !messages.length ? <p className="text-sm text-muted-foreground">Nenhuma mensagem registrada.</p> : ordered.map(m => <div key={m.id} className={`rounded-md border p-3 text-sm ${m.message_type === 'question' ? 'border-border bg-muted/50' : 'ml-6 border-primary/40 bg-primary/10'}`}>
      <div className="mb-1 flex flex-wrap justify-between gap-2"><span className="font-semibold">{m.message_type === 'question' ? 'Mensagem' : 'Resposta'} {numbers.get(m.message_type === 'question' ? m.id : m.parent_message_id ?? '')} · {authorName(m.author_id)}</span><span className="text-xs text-muted-foreground">{new Date(m.created_at).toLocaleString('pt-BR')}</span></div>
      {m.message_type === 'question' && m.recipient_id && <p className="mb-2 text-xs text-muted-foreground">Para: {authorName(m.recipient_id)}</p>}
      <p className="whitespace-pre-wrap break-words">{m.message}</p>
      <MessageAttachmentList bucket={SUPPLY_ATTACHMENT_BUCKET} attachments={attachmentsFor(m.id)} onOpen={(a) => { const url = (a as SupplyAttachment).url; if (url) window.open(url, '_blank', 'noopener,noreferrer'); }} />
      {unanswered.has(m.id) && <Badge variant="destructive" className="mt-2">Aguardando resposta</Badge>}
    </div>)}
    {writable && <div className="space-y-2">
      {pending.length > 0 && <div className="flex gap-2"><Button size="sm" variant="ghost" actionKind="standard" aria-pressed={mode === 'answer'} className={mode === 'answer' ? "underline underline-offset-4" : undefined} onClick={() => setMode('answer')}>Responder</Button><Button size="sm" variant="ghost" actionKind="standard" aria-pressed={mode === 'question'} className={mode === 'question' ? "underline underline-offset-4" : undefined} onClick={() => setMode('question')}>Nova mensagem</Button></div>}
      {answering && pending.length > 1 && <Select value={pending.some(q => q.id === replyId) ? replyId : pending[0]?.id} onValueChange={setReplyId}><SelectTrigger aria-label="Responder à mensagem"><SelectValue /></SelectTrigger><SelectContent>{pending.map(q => <SelectItem key={q.id} value={q.id}>Mensagem {numbers.get(q.id)}: {q.message.slice(0,70)}</SelectItem>)}</SelectContent></Select>}
      {!answering && <div className="space-y-2"><Label>Enviar mensagem para</Label><SearchableSelect aria-label="Destinatário da mensagem" value={recipient} onChange={setRecipient} placeholder="Selecione o destinatário" options={users.filter(u => u.id !== me?.id).map(u => ({ value: u.id, label: u.full_name }))} /></div>}
      <Label htmlFor={`supply-message-${order.id}`}>{answering ? 'Responder à mensagem' : 'Mensagem'}</Label>
      <Textarea id={`supply-message-${order.id}`} value={text} onChange={e => setText(e.target.value)} maxLength={4000} className="min-h-24" placeholder={answering ? 'Digite sua resposta' : 'Digite sua mensagem'} />
      <MessageAttachmentField id={`supply-message-files-${order.id}`} files={files} onChange={setFiles} />
      <div className="flex justify-end"><Button variant="outline" onClick={() => send.mutate()} disabled={send.isPending || (!text.trim() && !files.length)}><Send className="h-4 w-4" />{send.isPending ? 'Enviando...' : answering ? 'Enviar resposta' : 'Enviar mensagem'}</Button></div>
    </div>}
  </section>;
}
