import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { CdeButton } from '@/components/cde/cde-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { confirmAction } from '@/components/confirm-dialog';
import { emptyReimbursementAccount, reimbursementAccountSchema, type ReimbursementDetails } from '@/lib/reimbursement-account';

export function useReimbursementAccounts(userId: string) {
  return useQuery({ queryKey: ['reimbursement-accounts', userId], queryFn: async () => {
    const { data, error } = await supabase.from('reimbursement_accounts').select('*').eq('user_id', userId).eq('active', true).order('name');
    if (error) throw error;
    return data ?? [];
  }});
}
export function ReimbursementAccounts({ userId, value, onChange }: { userId: string; value?: string; onChange?: (id: string) => void }) {
  const { data: accounts = [] } = useReimbursementAccounts(userId);
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState(emptyReimbursementAccount);
  const [busy, setBusy] = useState(false);
  const update = (field: keyof ReimbursementDetails, value: string) => setDraft(prev => ({ ...prev, [field]: value }));
  async function save() {
    const parsed = reimbursementAccountSchema.safeParse(draft);
    if (!parsed.success) { toast.error('Preencha nome, titular e os dados bancários ou PIX.'); return; }
    setBusy(true);
    try {
      const payload = { name: parsed.data.name, details: parsed.data, user_id: userId };
      const result = editing ? await supabase.from('reimbursement_accounts').update(payload).eq('id', editing).select('id').single() : await supabase.from('reimbursement_accounts').insert(payload).select('id').single();
      if (result.error) throw result.error;
      await qc.invalidateQueries({ queryKey: ['reimbursement-accounts', userId] });
      onChange?.(result.data.id); setOpen(false); toast.success('Conta salva');
    } catch { toast.error('Não foi possível salvar a conta.'); } finally { setBusy(false); }
  }
  async function remove(id: string) {
    if (!await confirmAction('Retirar esta conta das próximas solicitações? Os reembolsos anteriores preservarão os dados.', { title: 'Excluir conta' })) return;
    const { error } = await supabase.from('reimbursement_accounts').update({ active: false }).eq('id', id);
    if (error) { toast.error('Não foi possível excluir a conta.'); return; }
    if (value === id) onChange?.('');
    await qc.invalidateQueries({ queryKey: ['reimbursement-accounts', userId] });
  }
  const field = (key: keyof ReimbursementDetails, label: string) => <div className="space-y-1"><Label htmlFor={`ra-${key}`}>{label}</Label><Input id={`ra-${key}`} value={draft[key]} onChange={e => update(key, e.target.value)} maxLength={150} /></div>;
  const select = (key: keyof ReimbursementDetails, label: string, values: string[]) => <div className="space-y-1"><Label>{label}</Label><Select value={draft[key]} onValueChange={v => update(key, v)}><SelectTrigger aria-label={label}><SelectValue /></SelectTrigger><SelectContent>{values.map(v => <SelectItem key={v} value={v}>{v === 'pix' ? 'PIX' : v === 'bank' ? 'Dados bancários' : v}</SelectItem>)}</SelectContent></Select></div>;
  return <section className="space-y-3 pt-3">
    <div className="flex items-center justify-between gap-2"><h3 className="text-sm font-semibold">Dados bancários / PIX</h3><div className="flex items-center gap-2"><CdeButton group="plus" screen="components/reimbursement-accounts.tsx" aria-label="Adicionar conta" title="Adicionar conta" onClick={() => { setDraft(emptyReimbursementAccount); setEditing(null); setOpen(true); }} /><Button variant="ghost" size="compactIcon" aria-label={expanded ? 'Recolher contas' : 'Exibir contas'} onClick={() => setExpanded(v => !v)}>{expanded ? <ChevronUp /> : <ChevronDown />}</Button></div></div>
    {onChange && <SearchableSelect aria-label="Conta para reembolso" value={value ?? ''} onChange={onChange} placeholder="Escolher conta bancária ou PIX" options={accounts.map(a => ({ value: a.id, label: a.name }))} />}
    {expanded && <div className="space-y-2">{!accounts.length && <p className="text-sm text-muted-foreground">Nenhuma conta cadastrada.</p>}{accounts.map(a => <div key={a.id} className="flex items-center justify-between gap-2 border-b border-border py-2"><span className="min-w-0 break-words text-sm">{a.name}</span><div className="flex shrink-0 gap-2"><Button variant="ghost" size="compactIcon" aria-label={`Editar conta ${a.name}`} onClick={() => { const parsed = reimbursementAccountSchema.safeParse(a.details); if (parsed.success) { setDraft({ ...parsed.data, name: a.name }); setEditing(a.id); setOpen(true); } }}><Pencil /></Button><Button variant="ghost" size="compactIcon" aria-label={`Excluir conta ${a.name}`} onClick={() => remove(a.id)}><Trash2 /></Button></div></div>)}</div>}
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>{editing ? 'Editar conta' : 'Nova conta'}</DialogTitle></DialogHeader><div className="grid gap-3 sm:grid-cols-2">{field('name', 'Nome da conta')}{select('person_type', 'Pessoa', ['PF', 'PJ'])}{field('holder', 'Titular')}{field('document', 'CPF / CNPJ')}{select('method', 'Forma de pagamento', ['pix', 'bank'])}{draft.method === 'pix' ? <>{select('pix_type', 'Tipo de chave PIX', ['cpf', 'cnpj', 'email', 'telefone', 'aleatoria'])}{field('pix_key', 'Chave PIX')}</> : <>{field('bank', 'Banco')}{field('agency', 'Agência')}{field('account', 'Conta com dígito')}{select('account_type', 'Tipo de conta', ['corrente', 'poupanca', 'pagamento'])}</>}</div><div className="flex justify-end"><Button onClick={save} disabled={busy}>Salvar</Button></div></DialogContent></Dialog>
  </section>;
}

export function ReimbursementDestination({ orderId }: { orderId: string }) {
  const { data, isLoading, error } = useQuery({ queryKey: ['reimbursement-destination', orderId], queryFn: async () => {
    const { data, error } = await supabase.from('reimbursement_destinations').select('details').eq('order_id', orderId).maybeSingle();
    if (error) throw error;
    return data;
  }});
  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando dados de pagamento...</p>;
  if (error) return <p className="text-sm text-destructive">Não foi possível carregar os dados de pagamento.</p>;
  if (!data) return null;
  const result = reimbursementAccountSchema.safeParse(data.details);
  if (!result.success) return null;
  const v = result.data;
  return <section className="space-y-2 border-t border-border pt-3"><h3 className="text-sm font-semibold">Dados para reembolso</h3><div className="grid gap-2 text-sm sm:grid-cols-2"><p>{v.name} · {v.person_type}</p><p>Titular: {v.holder}</p>{v.document && <p>CPF / CNPJ: {v.document}</p>}{v.method === 'pix' ? <p className="break-all">PIX: {v.pix_key}</p> : <><p>Banco: {v.bank}</p><p>Agência: {v.agency}</p><p>Conta: {v.account} · {v.account_type}</p></>}</div></section>;
}