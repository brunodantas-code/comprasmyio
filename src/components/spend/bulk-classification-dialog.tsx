import { useState } from 'react';
import { ListChecks, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
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
      <DialogContent className="sm:max-w-2xl" aria-describedby={undefined} topActions={<Button variant="ghost" size="icon" title="Salvar classificação em lote" aria-label="Salvar classificação em lote" disabled={busy || !sameStatement || !Object.keys(patch).length} onClick={async () => { if (await apply(patch)) setOpen(false); }}><Save /></Button>}>
        <DialogHeader><DialogTitle>Classificação em lote</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">{targets.length} lançamentos selecionados · {BRL.format(targets.reduce((total, line) => total + line.amount, 0))}</p>
        {!sameStatement && <p role="alert" className="text-sm text-destructive">Selecione lançamentos da mesma fatura.</p>}
        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-0 space-y-1"><Label>Centro de Custo</Label><SearchableSelect aria-label="Centro de Custo em lote" value={center} onChange={setCenter} options={data.centers.map(item => ({ value: item.id, label: item.name }))} placeholder="Manter Centro de Custo atual" disabled={busy}/></div>
          <div className="min-w-0 space-y-1"><Label>Plano de Contas</Label><SearchableSelect aria-label="Plano de Contas em lote" value={account} onChange={setAccount} options={data.accounts.map(item => ({ value: item.id, label: item.name }))} placeholder="Manter Plano de Contas atual" disabled={busy}/></div>
          <div className="min-w-0 space-y-1"><Label>Projeto</Label><SearchableSelect aria-label="Projeto em lote" value={project} onChange={setProject} options={data.projects.map(item => ({ value: item.id, label: item.name }))} placeholder="Manter Projeto atual" disabled={busy}/></div>
        </div>
      </DialogContent>
    </Dialog>
  </>;
}