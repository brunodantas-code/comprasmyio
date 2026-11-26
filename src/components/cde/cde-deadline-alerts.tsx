import { Save, X } from "lucide-react";
import { CdeSection } from "./cde-section";
import { useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { parseDeadlineAlerts, parseMinutesAlerts } from '@/lib/supply-deadlines';
import { CdeButton, useCdeStandards } from './cde-button';
import { CdeCategoryHeader } from './cde-category-header';
import { NumericMarkerEditor } from './numeric-marker-editor';
const rawAlerts = (data: ReturnType<typeof useCdeStandards>['data']) => data?.selected.find(s=>s.group_key==='deadline_alerts' && s.is_primary)?.variant_key;
export function useDeadlineAlerts() {
  const {data}=useCdeStandards();
  return parseDeadlineAlerts(rawAlerts(data));
}
export function useMinutesAlerts() {
  const {data}=useCdeStandards();
  return parseMinutesAlerts(rawAlerts(data));
}
function SubHeader({ title, hint }: { title: string; hint: string }) {
  return <header className="cde-section-header"><div className="min-w-0"><h3 className="cde-section-title">{title}</h3><p className="cde-sub-hint mt-1">{hint}</p></div></header>;
}
export function CdeDeadlineAlerts({number,handle}:{number:number;handle?:ReactNode}) {
  const {data}=useCdeStandards(); const qc=useQueryClient();
  const saved=useDeadlineAlerts(); const savedMinutes=useMinutesAlerts();
  const [open,setOpen]=useState(false); const [contentOpen,setContentOpen]=useState(true); const [draft,setDraft]=useState(saved); const [minutes,setMinutes]=useState(savedMinutes); const [busy,setBusy]=useState(false);
  async function save() {
    if(draft.criticalDays<0 || draft.warningDays<draft.criticalDays || draft.warningDays>365 || !Number.isInteger(draft.warningDays) || !Number.isInteger(draft.criticalDays)) {toast.error('Approvals: informe dias inteiros, primeiro alerta igual ou maior que o crítico, até 365 dias.');return;}
    if(!Number.isInteger(minutes.warningDays) || minutes.warningDays<0 || minutes.warningDays>365) {toast.error('Atas: informe dias inteiros entre 0 e 365.');return;}
    setBusy(true);
    try {
      const user=(await supabase.auth.getUser()).data.user; if(!user) throw new Error('Sessão não encontrada');
      const row=data?.selected.find(s=>s.group_key==='deadline_alerts' && s.is_primary);
      const value=JSON.stringify({...draft,minutes});
      const result=row ? await supabase.from('cde_selected').update({variant_key:value,chosen_by:user.id}).eq('group_key','deadline_alerts').eq('is_primary',true) : await supabase.from('cde_selected').insert({group_key:'deadline_alerts',variant_key:value,is_primary:true,chosen_by:user.id});
      if(result.error) throw result.error;
      await qc.invalidateQueries({queryKey:['cde-standards']}); toast.success('Prazos dos alertas atualizados');
    } catch(e) {toast.error(e instanceof Error?e.message:'Não foi possível salvar');} finally {setBusy(false);}
  }
  const reset=()=>{setDraft(saved);setMinutes(savedMinutes);};
  return <section className="cde-category-sections"><CdeCategoryHeader number={number} handle={handle} title="Alertas" hint={`Notificações e prazos · Approvals ${saved.warningDays} e ${saved.criticalDays} dias · Atas ${savedMinutes.warningDays} dias`} open={open} onToggle={()=>{reset();setOpen(!open);}}/>{open && <div className="space-y-4"><CdeSection title="Prazos dos alertas" open={contentOpen} actions={<><Button variant="ghost" size="icon" aria-label="Salvar alertas" title="Salvar alertas" onClick={save} disabled={busy || (JSON.stringify(draft) === JSON.stringify(saved) && JSON.stringify(minutes) === JSON.stringify(savedMinutes))}><Save /></Button><Button variant="ghost" size="icon" aria-label="Cancelar alertas" title="Cancelar" onClick={reset}><X /></Button><CdeButton group="toggle" screen="components/cde/cde-deadline-alerts.tsx" aria-label={`${contentOpen ? "Recolher" : "Exibir"} prazos dos alertas`} title={`${contentOpen ? "Recolher" : "Exibir"} prazos dos alertas`} aria-expanded={contentOpen} onClick={() => setContentOpen(!contentOpen)} /></>}>
    <div className="space-y-3"><SubHeader title="Approvals" hint="Antes do recebimento"/><div className="grid max-w-lg gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="warning-days">Primeiro alerta (dias antes)</Label><Input id="warning-days" type="number" min={0} max={365} value={draft.warningDays} onChange={e=>setDraft({...draft,warningDays:Number(e.target.value)})}/></div><div className="space-y-2"><Label htmlFor="critical-days">Alerta crítico (dias antes)</Label><Input id="critical-days" type="number" min={0} max={365} value={draft.criticalDays} onChange={e=>setDraft({...draft,criticalDays:Number(e.target.value)})}/></div></div></div>
    <div className="space-y-3"><SubHeader title="Atas" hint="Ações pendentes antes da conclusão prevista"/><div className="grid max-w-lg gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="minutes-warning-days">Alerta (dias antes)</Label><Input id="minutes-warning-days" type="number" min={0} max={365} value={minutes.warningDays} onChange={e=>setMinutes({warningDays:Number(e.target.value)})}/></div></div></div>
    </CdeSection><NumericMarkerEditor kind="alert_marker" number={`${number}.3`} /></div>}</section>;
}
