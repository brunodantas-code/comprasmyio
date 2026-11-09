import { useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { useQueryClient } from '@tanstack/react-query';
import { FileSignature } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { PersonalSignature } from '@/components/personal-signature';
import { signLegalDocument } from '@/lib/signatures.functions';
import { signDocumentSchema } from '@/lib/signatures';
import type { Database } from '@/integrations/supabase/types';

export function SignDocumentDialog({ target, userId, close, signed }: { target: { row: Database['public']['Tables']['legal_records']['Row']; participantId: string | null; name: string } | null; userId: string; close: () => void; signed: () => void }) {
  const [password, setPassword] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const sign = useServerFn(signLegalDocument); const qc = useQueryClient();
  async function submit(event: React.FormEvent) {
    event.preventDefault(); if (!target) return;
    const parsed = signDocumentSchema.safeParse({ recordId: target.row.id, participantId: target.participantId, expectedUpdatedAt: target.row.updated_at, password });
    if (!parsed.success) { setError('Informe sua senha'); return; }
    setBusy(true); setError('');
    try { await sign({ data: parsed.data }); await Promise.all([qc.invalidateQueries({ queryKey: ['legal-records'] }), qc.invalidateQueries({ queryKey: ['legal-signature-events'] }), qc.invalidateQueries({ queryKey: ['pending-actions'] })]); setPassword(''); toast.success('Assinatura registrada'); signed(); close(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível assinar'); setPassword(''); } finally { setBusy(false); }
  }
  return <Dialog open={Boolean(target)} onOpenChange={open => { if (!open && !busy) { setPassword(''); setError(''); close(); } }}><DialogContent className="max-h-[90dvh] overflow-y-auto"><DialogHeader><DialogTitle>Assinar {target?.row.title}</DialogTitle></DialogHeader><p className="text-sm">{target?.name}</p><PersonalSignature userId={userId} initiallyOpen /><form className="space-y-3" onSubmit={submit}><Label htmlFor="sign-password">Senha de acesso</Label><PasswordInput id="sign-password" autoComplete="current-password" value={password} maxLength={256} onChange={e => setPassword(e.target.value)} disabled={busy} />{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<div className="flex justify-end"><Button type="submit" disabled={busy || !password}><FileSignature />{busy ? 'Assinando...' : 'Assinar'}</Button></div></form></DialogContent></Dialog>;
}