import { useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { useQueryClient } from '@tanstack/react-query';
import { FileSignature } from 'lucide-react';
import { toast } from 'sonner';
import { signInventory } from '@/lib/inventory-signatures.functions';
import { PersonalSignature } from '@/components/personal-signature';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

export function InventorySignatureDialog({ inventory, userId, close }: { inventory: { id: string; name: string; completed_at: string | null } | null; userId: string; close: () => void }) {
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const sign = useServerFn(signInventory);
  const qc = useQueryClient();
  return <Dialog open={!!inventory} onOpenChange={open => { if (!open && !busy) { setPassword(''); setError(''); close(); } }}><DialogContent className="max-h-[90dvh] overflow-y-auto"><DialogHeader><DialogTitle>Assinar {inventory?.name}</DialogTitle></DialogHeader><PersonalSignature userId={userId} initiallyOpen /><form className="space-y-3" onSubmit={async event => {
    event.preventDefault();
    if (!inventory?.completed_at) return;
    setBusy(true); setError('');
    try {
      await sign({ data: { inventoryId: inventory.id, completedAt: inventory.completed_at, password } });
      await Promise.all(['inventory-signatures', 'pending-actions', 'stock-inventories'].map(key => qc.invalidateQueries({ queryKey: [key] })));
      setPassword(''); toast.success('Assinatura registrada'); close();
    } catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível assinar'); setPassword(''); }
    finally { setBusy(false); }
  }}><Label htmlFor="inventory-sign-password">Senha de acesso</Label><PasswordInput id="inventory-sign-password" autoComplete="current-password" maxLength={256} value={password} disabled={busy} onChange={e => setPassword(e.target.value)} />{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<div className="flex justify-end"><Button type="submit" disabled={busy || !password}><FileSignature />{busy ? 'Assinando…' : 'Assinar'}</Button></div></form></DialogContent></Dialog>;
}