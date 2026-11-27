import { useState } from 'react';
import { ListChecks, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SpendClassificationFields } from './classification-fields';
import { BRL } from '@/components/cash-flow/shared';
import { bulkClassificationPatch } from './classification';
import type { Line, SpendData } from './data';

export function SpendBulkClassificationDialog({ data, targets, busy, apply }: { data: SpendData; targets: Line[]; busy: boolean; apply: (patch: ReturnType<typeof bulkClassificationPatch>) => Promise<boolean> }) {
  const [open, setOpen] = useState(false);
  const [account, setAccount] = useState('');
  const [center, setCenter] = useState('');
  const [project, setProject] = useState('');
  const patch = bulkClassificationPatch(account, center, project);
  const sameStatement = new Set(targets.map(line => line.statement_id)).size === 1;
  return <>
    <Button disabled={busy || !targets.length} title="Classificação em lote" aria-label="Classificação em lote" onClick={() => { setAccount(''); setCenter(''); setProject(''); setOpen(true); }}><ListChecks /><span>Classificação em lote</span></Button>
    <Dialog open={open} onOpenChange={value => { if (!busy) setOpen(value); }}>
      <DialogContent className="grid-cols-[minmax(0,1fr)] sm:max-w-2xl" aria-describedby={undefined} topActions={<Button variant="ghost" size="icon" title="Salvar classificação em lote" aria-label="Salvar classificação em lote" disabled={busy || !sameStatement || !Object.keys(patch).length} onClick={async () => { if (await apply(patch)) setOpen(false); }}><Save /></Button>}>
        <DialogHeader className="min-w-0 text-left pr-0"><DialogTitle className="break-words">Classificação em lote</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">{targets.length} lançamentos selecionados · {BRL.format(targets.reduce((total, line) => total + line.amount, 0))}</p>
        {!sameStatement && <p role="alert" className="text-sm text-destructive">Selecione lançamentos da mesma fatura.</p>}
        <SpendClassificationFields data={data} account={account} center={center} project={project} setAccount={setAccount} setCenter={setCenter} setProject={setProject} disabled={busy} bulk />
      </DialogContent>
    </Dialog>
  </>;
}