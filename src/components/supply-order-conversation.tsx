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

export function SupplyOrderConversation({ order, nameFor }: { order: { id: string; requester_id: string; status: string; request_type: string }; nameFor: (id: string) => string }) {
  const { data: me } = useCurrentUser();
  const qc = useQueryClient();
  const [mode, setMode] = useState<'question' | 'answer'>('answer');
  const [replyId, setReplyId] = useState('');
  const [text, setText] = useState('');
  const { data: messages = [], isLoading, error } = useQuery({
    queryKey: ['supply-order-messages', order.id],
    queryFn: async () => {
      const result = await supabase.from('supply_order_messages').select('*').eq('order_id', order.id).order('created_at');
      if (result.error) throw result.error;
      return result.data ?? [];
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
  const send = useMutation({
    mutationFn: async () => {
      if (!me || !writable || !text.trim()) throw new Error('Não é possível enviar esta mensagem.');
      const parent = answering ? pending.find(q => q.id === replyId) ?? pending[0] : undefined;
      const { error } = await supabase.from('supply_order_messages').insert({ order_id: order.id, author_id: me.id, message_type: answering ? 'answer' : 'question', parent_message_id: parent?.id ?? null, message: text.trim() });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(answering ? 'Resposta enviada' : 'Pergunta enviada'); setText(''); setReplyId(''); setMode('answer');
      for (const key of ['supply-order-messages', 'order-report-logs', 'order-report-related-logs', 'pending-actions', 'logs']) void qc.invalidateQueries({ queryKey: [key] });
    }, onError: (e: Error) => toast.error(e.message),
  });
  return <section className="space-y-3 border-t pt-4">
    <h3 className="flex items-center gap-2 text-sm font-semibold"><MessageCircleQuestion className="h-4 w-4" />Conversa</h3>
    {error ? <p className="text-sm text-destructive">Não foi possível carregar a conversa.</p> : isLoading ? <p className="text-sm text-muted-foreground">Carregando...</p> : !messages.length ? <p className="text-sm text-muted-foreground">Nenhuma mensagem registrada.</p> : ordered.map(m => <div key={m.id} className={`rounded-md border p-3 text-sm ${m.message_type === 'question' ? 'border-border bg-muted/50' : 'ml-6 border-primary/40 bg-primary/10'}`}>
      <div className="mb-1 flex flex-wrap justify-between gap-2"><span className="font-semibold">{m.message_type === 'question' ? 'Pergunta' : 'Resposta'} {numbers.get(m.message_type === 'question' ? m.id : m.parent_message_id ?? '')} · {m.author_id === order.requester_id ? 'Solicitante' : 'Comprador'} · {nameFor(m.author_id)}</span><span className="text-xs text-muted-foreground">{new Date(m.created_at).toLocaleString('pt-BR')}</span></div>
      <p className="whitespace-pre-wrap break-words">{m.message}</p>{unanswered.has(m.id) && <Badge variant="destructive" className="mt-2">Aguardando resposta</Badge>}
    </div>)}
    {writable && <div className="space-y-2">
      {pending.length > 0 && <div className="flex gap-2"><Button size="sm" variant={mode === 'answer' ? 'default' : 'outline'} onClick={() => setMode('answer')}>Responder</Button><Button size="sm" variant={mode === 'question' ? 'default' : 'outline'} onClick={() => setMode('question')}>Nova pergunta</Button></div>}
      {answering && pending.length > 1 && <Select value={pending.some(q => q.id === replyId) ? replyId : pending[0]?.id} onValueChange={setReplyId}><SelectTrigger aria-label="Responder à pergunta"><SelectValue /></SelectTrigger><SelectContent>{pending.map(q => <SelectItem key={q.id} value={q.id}>Pergunta {numbers.get(q.id)}: {q.message.slice(0,70)}</SelectItem>)}</SelectContent></Select>}
      <Label htmlFor={`supply-message-${order.id}`}>{answering ? 'Responder à pergunta' : me?.id === order.requester_id ? 'Pergunta ao Comprador' : 'Pergunta ao Solicitante'}</Label>
      <Textarea id={`supply-message-${order.id}`} value={text} onChange={e => setText(e.target.value)} maxLength={4000} className="min-h-24" placeholder={answering ? 'Digite sua resposta' : 'Digite sua pergunta'} />
      <div className="flex justify-end"><Button variant="outline" onClick={() => send.mutate()} disabled={send.isPending || !text.trim()}><Send className="h-4 w-4" />{send.isPending ? 'Enviando...' : answering ? 'Enviar resposta' : 'Enviar pergunta'}</Button></div>
    </div>}
  </section>;
}