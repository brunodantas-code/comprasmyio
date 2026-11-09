import { useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { parseDeadlineAlerts } from '@/lib/supply-deadlines';
import { useCdeStandards } from './cde-button';
import { CdeCategoryHeader } from './cde-category-header';
export function useDeadlineAlerts() {
  const {data}=useCdeStandards();
  return parseDeadlineAlerts(data?.selected.find(s=>s.group_key==='deadline_alerts' && s.is_primary)?.variant_key);
}
export function CdeDeadlineAlerts({number,handle}:{number:number;handle?:ReactNode}) {
  const {data}=useCdeStandards(); const qc=useQueryClient();
  const saved=useDeadlineAlerts();
  const [open,setOpen]=useState(false); const [draft,setDraft]=useState(saved); const [busy,setBusy]=useState(false);
  async function save() {
    if(draft.criticalDays<0 || draft.warningDays<draft.criticalDays || draft.warningDays>365 || !Number.isInteger(draft.warningDays) || !Number.isInteger(draft.criticalDays)) {toast.error('Informe dias inteiros: primeiro alerta igual ou maior que o crítico, até 365 dias.');return;}
    setBusy(true);
    try {
      const user=(await supabase.auth.getUser()).data.user; if(!user) throw new Error('Sessão não encontrada');
      const row=data?.selected.find(s=>s.group_key==='deadline_alerts' && s.is_primary);
      const value=JSON.stringify(draft);
      const result=row ? await supabase.from('cde_selected').update({variant_key:value,chosen_by:user.id}).eq('group_key','deadline_alerts').eq('is_primary',true) : await supabase.from('cde_selected').insert({group_key:'deadline_alerts',variant_key:value,is_primary:true,chosen_by:user.id});
      if(result.error) throw result.error;
      await qc.invalidateQueries({queryKey:['cde-standards']}); toast.success('Prazos dos alertas atualizados');
    } catch(e) {toast.error(e instanceof Error?e.message:'Não foi possível salvar');} finally {setBusy(false);}
  }
  return <section className="space-y-4"><CdeCategoryHeader number={number} handle={handle} title="Alertas de prazo dos Approvals" hint={`${saved.warningDays} e ${saved.criticalDays} dias antes do recebimento`} open={open} onToggle={()=>{setDraft(saved);setOpen(!open);}}/>{open && <div className="space-y-4 px-4"><div className="grid max-w-lg gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="warning-days">Primeiro alerta (dias antes)</Label><Input id="warning-days" type="number" min={0} max={365} value={draft.warningDays} onChange={e=>setDraft({...draft,warningDays:Number(e.target.value)})}/></div><div className="space-y-2"><Label htmlFor="critical-days">Alerta crítico (dias antes)</Label><Input id="critical-days" type="number" min={0} max={365} value={draft.criticalDays} onChange={e=>setDraft({...draft,criticalDays:Number(e.target.value)})}/></div></div><div className="flex gap-2"><Button onClick={save} disabled={busy}>Salvar</Button><Button onClick={()=>setDraft(saved)}>Cancelar</Button></div></div>}</section>;
}