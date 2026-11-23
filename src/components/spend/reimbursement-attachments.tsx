import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { spendFileUrl } from './data';
import type { ReimbursementDraft } from './reimbursement';

export function ReimbursementAttachments({ draft }: { draft: ReimbursementDraft }) {
  const [index, setIndex] = useState<number | null>(null);
  const receipt = index === null ? undefined : draft.receipts[index];
  const file = index === null ? undefined : draft.files[index];
  const preview = useQuery({ queryKey: ['spend-file', receipt?.file_path], enabled: !!receipt, queryFn: () => receipt ? spendFileUrl(receipt.file_path) : Promise.resolve(''), staleTime: 300000 });
  return <div className="space-y-1"><p className="text-sm">Comprovantes do Spend ({draft.receipts.length})</p>{draft.receipts.map((r, i) => <Button key={r.id} type="button" variant="link" className="!h-auto !min-w-0 !max-w-full !justify-start !p-0 !text-left whitespace-normal text-foreground" title={`Abrir comprovante de ${r.merchant}`} onClick={() => setIndex(i)}><Paperclip className="shrink-0" /><span className="break-words">{draft.files[i]?.name ?? r.merchant}</span></Button>)}
    <Dialog open={index !== null} onOpenChange={v => { if (!v) setIndex(null); }}><DialogContent className="sm:max-w-3xl" aria-describedby={undefined}><DialogHeader><DialogTitle>Comprovante · {receipt?.merchant}</DialogTitle></DialogHeader>{preview.isPending ? <p>Carregando comprovante...</p> : preview.error ? <p className="text-destructive">Não foi possível abrir o comprovante.</p> : file?.type === 'application/pdf' ? <a href={preview.data} target="_blank" rel="noreferrer">Abrir PDF</a> : <img src={preview.data} alt={`Comprovante de ${receipt?.merchant ?? ''}`} className="h-auto max-w-full object-contain" />}</DialogContent></Dialog>
  </div>;
}