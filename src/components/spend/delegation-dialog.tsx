import { useState } from "react";
import { UserCheck, Trash2, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { formatDate } from "@/components/cash-flow/shared";
import { spendDelegation, type SpendCard, type SpendData } from "./data";

const isoDay = (offset = 0) => { const d = new Date(); d.setDate(d.getDate() + offset); return d.toLocaleDateString("sv-SE"); };

export function DelegationDialog({ card, data, refresh }: { card: SpendCard; data: SpendData; refresh: () => Promise<void> }) {
  const [open, setOpen] = useState(false); const [busy, setBusy] = useState(false);
  const [delegate, setDelegate] = useState(""); const [until, setUntil] = useState(isoDay(7));
  const active = data.delegations.filter(d => d.card_id === card.id);
  const name = (id: string) => data.users.find(u => u.id === id)?.name ?? "—";
  async function run(fn: () => Promise<unknown>, ok: string) { setBusy(true); try { await fn(); await refresh(); toast.success(ok); } catch (e) { toast.error(e instanceof Error ? e.message : "Falha"); } finally { setBusy(false); } }
  return <><Button variant="ghost" title="Autorizar outra pessoa a enviar comprovantes deste cartão" aria-label="Autorizar uso do cartão" onClick={() => setOpen(true)}><UserCheck /><span>Autorizar uso</span></Button>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="sm:max-w-lg" aria-describedby={undefined}><DialogHeader><DialogTitle>Autorização temporária · •••• {card.last_four}</DialogTitle></DialogHeader>
      <p className="text-sm text-muted-foreground">A pessoa autorizada só envia comprovantes neste cartão e vê apenas os que ela enviou. A fatura e seus demais comprovantes continuam privados.</p>
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_10rem_auto] sm:items-end">
        <div className="min-w-0 space-y-1"><Label>Pessoa autorizada</Label><SearchableSelect aria-label="Pessoa autorizada" value={delegate} onChange={setDelegate} options={data.users.filter(u => u.id !== data.user_id).map(u => ({ value: u.id, label: u.name }))} placeholder="Selecionar" /></div>
        <div className="space-y-1"><Label htmlFor="spend-delegation-until">Válida até</Label><Input id="spend-delegation-until" type="date" min={isoDay()} max={isoDay(90)} value={until} onChange={e => setUntil(e.target.value)} /></div>
        <Button variant="ghost" size="icon" title="Salvar autorização" aria-label="Salvar autorização" disabled={busy || !delegate || !until} onClick={() => run(() => spendDelegation("grant", { card_id: card.id, delegate_id: delegate, expires_at: until }), "Autorização salva").then(() => setDelegate(""))}><Save /></Button>
      </div>
      <div className="divide-y divide-border">{active.map(d => <div key={d.id} className="flex items-center justify-between gap-3 py-2 text-sm"><span className="min-w-0 truncate">{name(d.delegate_id)} · até {formatDate(d.expires_at)}</span><Button variant="ghost" size="icon" title="Revogar autorização" aria-label={`Revogar autorização de ${name(d.delegate_id)}`} disabled={busy} onClick={() => run(() => spendDelegation("revoke", { id: d.id }), "Autorização revogada")}><Trash2 /></Button></div>)}{!active.length && <p className="py-3 text-sm text-muted-foreground">Nenhuma autorização ativa.</p>}</div>
    </DialogContent></Dialog></>;
}
