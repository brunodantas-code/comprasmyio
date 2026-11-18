import {useState} from "react";
import {useQuery,useQueryClient} from "@tanstack/react-query";
import {Save} from "lucide-react";
import {toast} from "sonner";
import {supabase} from "@/integrations/supabase/client";
import {Button} from "@/components/ui/button";
import {Checkbox} from "@/components/ui/checkbox";
import {CdeCategoryHeader} from "./cde-category-header";
export function CdeProjectBudget({number,handle}:{number:number;handle?:React.ReactNode}){
 const [open,setOpen]=useState(false),[draft,setDraft]=useState<string[]|null>(null),[saving,setSaving]=useState(false);
 const qc=useQueryClient();
 const {data=[]}=useQuery({queryKey:["pm-budget-catalog"],queryFn:async()=>{const r=await supabase.rpc("pm_budget_catalog");if(r.error)throw r.error;return r.data??[];}});
 const ids=draft??data.filter(a=>a.selected).map(a=>a.id);
 async function save(){setSaving(true);try{
  const remove=data.filter(a=>a.selected&&!ids.includes(a.id)).map(a=>a.id);
  const add=ids.filter(id=>!data.some(a=>a.id===id&&a.selected));
  if(add.length){const r=await supabase.from("pm_budget_accounts").insert(add.map(account_id=>({account_id})));if(r.error)throw r.error;}
  if(remove.length){const r=await supabase.from("pm_budget_accounts").delete().in("account_id",remove);if(r.error)throw r.error;}
  const check=await supabase.rpc("pm_budget_catalog");if(check.error)throw check.error;
  const saved=(check.data??[]).filter(a=>a.selected).map(a=>a.id);
  if(saved.length!==ids.length||ids.some(id=>!saved.includes(id)))throw new Error("Não foi possível confirmar as contas selecionadas.");
  await Promise.all([qc.invalidateQueries({queryKey:["pm-budget-catalog"]}),qc.invalidateQueries({queryKey:["pm-workspace"]})]);setDraft(null);toast.success("Plano sintético atualizado");
 }catch{toast.error("Não foi possível salvar o plano sintético.");}finally{setSaving(false);}}
 return <section><CdeCategoryHeader number={number} handle={handle} title="Orçamento do Projects" hint="Plano de contas sintético baseado nas despesas do Cash Flow" open={open} onToggle={()=>setOpen(!open)}/>{open?<div className="space-y-4 py-4"><div className="grid gap-3 sm:grid-cols-2">{data.map(a=><label key={a.id} className="flex min-w-0 items-center gap-2 text-sm"><Checkbox checked={ids.includes(a.id)} disabled={saving} onCheckedChange={checked=>setDraft(checked?[...ids,a.id]:ids.filter(id=>id!==a.id))}/><span>{a.code} · {a.name}</span></label>)}</div><Button variant="ghost" size="icon" title="Salvar plano sintético" aria-label="Salvar plano sintético" disabled={saving||!draft} onClick={save}><Save/></Button></div>:null}</section>;
}