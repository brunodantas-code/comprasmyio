import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { spendFileUrl } from './data';
import type { ReimbursementDraft } from './reimbursement';

export function ReimbursementAttachments({ draft }: { draft: ReimbursementDraft }) {
  const [index, setIndex] = useState<number | null>(null);
  const receipt = index === null ? undefined : draft.receipts[index];
  const file = index === null ? undefined : draft.files[index];
  const preview = useQuery({ queryKey: ['spend-file', receipt?.file_path], enabled: !!receipt, queryFn: () => receipt ? spendFileUrl(receipt.file_path) : Promise.resolve(''), staleTime: 300000 });
  return <div className="space-y-1"><p className="text-sm">Comprovantes do Spend ({draft.receipts.length})</p><ul className="space-y-1 text-sm">{draft.receipts.map((r, i) => <li key={r.id} className="flex min-w-0 justify-start"><Button type="button" variant="link" className="!h-auto !min-w-0 !max-w-full !justify-start !self-start !p-0 !text-left !font-normal whitespace-normal underline" title={`Abrir comprovante de ${r.merchant}`} onClick={() => setIndex(i)}><span className="break-words">{draft.files[i]?.name ?? r.merchant}</span></Button></li>)}</ul>
    <Dialog open={index !== null} onOpenChange={v => { if (!v) setIndex(null); }}><DialogContent className="sm:max-w-3xl" aria-describedby={undefined}><DialogHeader><DialogTitle>Comprovante · {receipt?.merchant}</DialogTitle></DialogHeader>{preview.isPending ? <p>Carregando comprovante...</p> : preview.error ? <p className="text-destructive">Não foi possível abrir o comprovante.</p> : file?.type === 'application/pdf' ? <a href={preview.data} target="_blank" rel="noreferrer">Abrir PDF</a> : <img src={preview.data} alt={`Comprovante de ${receipt?.merchant ?? ''}`} className="h-auto max-w-full object-contain" />}</DialogContent></Dialog>
  </div>;
}