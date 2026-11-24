import { useState } from 'react';
import { Save } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { BRL } from '@/components/cash-flow/shared';
import { missingReceiptDeclarations, missingReceiptLabels, type MissingReceiptDeclaration } from './missing-receipt';
import type { SpendAdjustment } from './pending';
export function MissingReceiptDialog({request,onClose,refresh}:{request:SpendAdjustment;onClose:()=>void;refresh:()=>Promise<void>}) {
  const [reason,setReason]=useState<MissingReceiptDeclaration | null>(null);
  const [busy,setBusy]=useState(false);
  async function save() {
    if(!reason || busy)return;
    setBusy(true);
    try {
      const result=await supabase.rpc('spend_resolve_missing_receipt',{_line_id:request.line_id,_requested_at:request.requested_at,_reason:reason});
      if(result.error)throw result.error;
      const value=result.data;
      if(!value || typeof value!=='object' || Array.isArray(value) || value['ok']!==true)throw new Error('Não foi possível confirmar a baixa');
      await refresh();onClose();toast.success('Resposta registrada; pendência encerrada para o portador');
    } catch(error) {toast.error(error instanceof Error ? error.message : 'Não foi possível salvar a resposta');}
    finally {setBusy(false);}
  }
  return <Dialog open onOpenChange={open=>{if(!open&&!busy)onClose();}}><DialogContent><DialogHeader><DialogTitle>Comprovante não disponível</DialogTitle></DialogHeader>
    <p className="break-words text-sm">{request.merchant} · {BRL.format(request.amount)}</p>
    <p className="break-words text-sm text-muted-foreground">{request.message}</p>
    {missingReceiptDeclarations.map(value=><div key={value} className="flex min-h-11 items-center gap-2"><Checkbox id={`missing-${request.line_id}-${value}`} aria-label={missingReceiptLabels[value]} checked={reason===value} disabled={busy} onCheckedChange={checked=>setReason(checked===true?value:null)}/><Label htmlFor={`missing-${request.line_id}-${value}`} className="flex min-h-11 flex-1 cursor-pointer items-center font-normal">{missingReceiptLabels[value]}</Label></div>)}
    <div className="flex justify-end"><Button variant="ghost" size="icon" aria-label="Salvar resposta sobre comprovante" title="Salvar resposta sobre comprovante" disabled={!reason||busy} onClick={()=>void save()}><Save/></Button></div>
  </DialogContent></Dialog>;
}