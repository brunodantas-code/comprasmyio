import { useTableFilters } from "@/components/use-table-filters";
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText, ChevronUp, ChevronDown, Layers3 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { consolidateDemands, demandGroups, type CatalogItem, type ConsolidationOrder } from '@/lib/supply-consolidation';
import { consolidationMoney, exportConsolidationPdf } from '@/lib/supply-consolidation-pdf';
async function fetchConsolidation() {
 async function pages<T>(load:(start:number,end:number)=>PromiseLike<{data:T[]|null;error:unknown}>) {const rows:T[]=[];for(let start=0;;start+=1000){const {data,error}=await load(start,start+999);if(error)throw error;rows.push(...(data||[]));if(!data||data.length<1000)break;}return rows;}
 const [orders,items,materials,third,tools,profiles,projects,clients]=await Promise.all([
  pages((s,e)=>supabase.from('purchase_orders').select('*').eq('status','pendente').in('approval_status',['aprovado','aguardando_aprovacao']).eq('request_model','materiais').order('id').range(s,e)),
  pages((s,e)=>supabase.from('purchase_order_items').select('*').order('id').range(s,e)),
  pages((s,e)=>supabase.from('materials').select('id,name,location,purchase_type,myio_code,manufacturer_code').order('id').range(s,e)),
  pages((s,e)=>supabase.from('terceiros_materials').select('id,name,purchase_type,myio_code,manufacturer_code').order('id').range(s,e)),
  pages((s,e)=>supabase.from('tool_assets').select('id,name,purchase_type,myio_code,manufacturer_code').order('id').range(s,e)),
  pages((s,e)=>supabase.from('profiles').select('id,full_name').order('id').range(s,e)),
  pages((s,e)=>supabase.from('projects').select('id,name').order('id').range(s,e)),
  pages((s,e)=>supabase.from('clients').select('id,name').order('id').range(s,e))
 ]);
 const catalog=new Map<string,CatalogItem>();for(const m of materials)catalog.set(`materials:${m.id}`,{id:m.id,name:m.name,origin:m.location==='fabrica'?'Fábrica':m.location==='almoxarifado'?'Almoxarifado':m.location,purchase_type:m.purchase_type,code:m.myio_code||m.manufacturer_code});for(const m of third)catalog.set(`terceiros:${m.id}`,{id:m.id,name:m.name,origin:'Terceiros',purchase_type:m.purchase_type,code:m.myio_code||m.manufacturer_code});for(const m of tools)catalog.set(`tools:${m.id}`,{id:m.id,name:m.name,origin:'Ferramentas',purchase_type:m.purchase_type,code:m.myio_code||m.manufacturer_code});
 return {orders,items,catalog,profiles:new Map(profiles.map(p=>[p.id,p.full_name])),projects:new Map(projects.map(p=>[p.id,p.name])),clients:new Map(clients.map(p=>[p.id,p.name]))};
}
export function SupplyConsolidation() {
 const [open,setOpen]=useState(false);const [mode,setMode]=useState<'item'|'requester'>('item');const [state,setState]=useState<'approved'|'pending'>('approved');const [expanded,setExpanded]=useState<Set<string>>(new Set());const [pdfDialog,setPdfDialog]=useState(false);const [exporting,setExporting]=useState(false);
 const {data,isLoading,error,refetch}=useQuery({queryKey:['supply-consolidation'],queryFn:fetchConsolidation,enabled:open});
 const destination=(o:ConsolidationOrder)=>o.allocation_type==='interna'?'Interna':o.for_stock||o.allocation_type==='estoque'?'Estoque':o.project_id?`Projeto: ${data?.projects.get(o.project_id)||'Não informado'}`:o.client_id?`Cliente: ${data?.clients.get(o.client_id)||'Não informado'}`:'Sem alocação';
 const allRows=data?consolidateDemands(data.orders,data.items,data.catalog,id=>data.profiles.get(id)||'Não informado',destination,state):[];
 const demandFilters = useTableFilters(allRows, [
  { key: "item", label: "Item / Código", value: r => `${r.item} ${r.code}` },
  { key: "requester", label: "Solicitante", value: r => r.requester },
  { key: "destination", label: "Projeto / Cliente / Destino", value: r => r.destination },
  { key: "origin", label: "Origem", value: r => r.origin },
  { key: "market", label: "Compra", value: r => r.market },
  { key: "date", label: "Data", kind: "date", value: r => r.date },
  { key: "value", label: "Valor", kind: "number", value: r => r.total },
 ]);
 const rows = demandFilters.filtered; const groups = demandGroups(rows,mode); const allExpanded = groups.length>0 && groups.every(g=>expanded.has(g.key));
 const filterText = `Situação: ${state==='approved'?'Aprovadas, ainda não compradas':'Em aprovação — não liberadas para compra'}; ${demandFilters.active} filtros por coluna; ${rows.length} itens selecionados`;
 async function download(detail:boolean){setExporting(true);try{await exportConsolidationPdf(groups,mode,detail,filterText);setPdfDialog(false);}catch{toast.error('Não foi possível gerar o PDF');}finally{setExporting(false);}}
 return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button variant="outline" size="sm"><Layers3/>Consolidar itens</Button></DialogTrigger><DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-6xl"><DialogHeader><DialogTitle>Consolidação de itens</DialogTitle></DialogHeader>
  <div className="flex flex-wrap items-center justify-between gap-2"><div className="flex gap-2"><Button variant={mode==='item'?'secondary':'outline'} size="sm" onClick={()=>setMode('item')}>Por Item</Button><Button variant={mode==='requester'?'secondary':'outline'} size="sm" onClick={()=>setMode('requester')}>Por Solicitante</Button></div><div className="flex gap-2"><Button variant="outline" size="compactIcon" disabled={!groups.length} aria-label={allExpanded?'Recolher todos os itens':'Exibir todos os itens'} title={allExpanded?'Recolher todos':'Exibir todos'} onClick={()=>setExpanded(allExpanded?new Set():new Set(groups.map(g=>g.key)))}>{allExpanded?<ChevronUp/>:<ChevronDown/>}</Button><Button variant="outline" size="compactIcon" disabled={!groups.length||exporting} aria-label="Exportar consolidação PDF" title="Exportar PDF" onClick={()=>setPdfDialog(true)}><FileText/></Button></div></div>
  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">{["item", "requester", "destination", "origin", "market", "date", "value"].map(key => <span key={key}>{demandFilters.header(key)}</span>)}<div className="flex items-center gap-2"><Label>Situação</Label><Select value={state} onValueChange={v=>setState(v==='pending'?'pending':'approved')}><SelectTrigger aria-label="Situação da consolidação"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="approved">Aprovadas, não compradas</SelectItem><SelectItem value="pending">Em aprovação</SelectItem></SelectContent></Select></div></div>
  {state==='pending'?<p className="text-sm text-destructive">Não liberado para compra</p>:null}
  {isLoading?<p className="text-sm text-muted-foreground">Carregando...</p>:error?<div><p className="text-sm text-destructive">Não foi possível consultar os itens.</p><Button variant="outline" size="sm" onClick={()=>refetch()}>Tentar novamente</Button></div>:<><div className="flex flex-wrap gap-x-6 gap-y-1 border-y border-border py-3 text-sm"><span>{groups.length} grupos</span><span>{new Set(rows.map(r=>r.orderId)).size} solicitações</span><span>{new Set(rows.map(r=>r.requesterId)).size} solicitantes</span><span>Estimado: {consolidationMoney(rows.reduce((s,r)=>s+(r.total||0),0))}{rows.some(r=>r.total===null)?' (parcial)':''}</span></div>{groups.length===0?<p className="py-6 text-center text-sm text-muted-foreground">Nenhuma demanda encontrada para os filtros selecionados.</p>:null}<div className="divide-y divide-border">{groups.map(g=><section key={g.key} className="py-3"><div className="flex items-start gap-2"><Button variant="outline" size="compactIcon" aria-label={`${expanded.has(g.key)?'Recolher':'Exibir'} ${g.label}`} onClick={()=>setExpanded(old=>{const n=new Set(old);if(n.has(g.key))n.delete(g.key);else n.add(g.key);return n;})}>{expanded.has(g.key)?<ChevronUp/>:<ChevronDown/>}</Button><div className="min-w-0 flex-1"><h2 className="break-words text-sm font-medium">{g.label}</h2><div className="text-xs text-muted-foreground">{g.market} · {g.origin}{mode==='item'?` · Código: ${g.rows[0].code} · Unidade: ${g.unit}`:''}</div></div><div className="shrink-0 text-right text-sm">{mode==='item'?<div>{g.quantity} · Qtd.</div>:null}<div>{consolidationMoney(g.total)}{g.missingValue?'*':''}</div><div className="text-xs text-muted-foreground">{g.orders} pedidos · {g.requesters} solicitantes</div></div></div>{expanded.has(g.key)?<div className="mt-3 space-y-2 pl-8">{g.rows.map(r=><div key={r.id} className="grid gap-1 border-t border-border py-2 text-xs sm:grid-cols-[minmax(0,2fr)_minmax(0,2fr)_minmax(0,1fr)]"><div className="break-words"><div>{r.number} · {r.item}</div><div className="text-muted-foreground">{r.requester} · {r.date.split('-').reverse().join('/')}</div></div><div className="break-words text-muted-foreground">{r.destination}<br/>{r.state}</div><div className="sm:text-right">Qtd.: {r.quantity}<br/>V. unit.: {r.unitValue===null?'Não informado':consolidationMoney(r.unitValue)}<br/>Subtotal: {r.total===null?'Não informado':consolidationMoney(r.total)}</div></div>)}</div>:null}</section>)}</div></>}
  <Dialog open={pdfDialog} onOpenChange={setPdfDialog}><DialogContent><DialogHeader><DialogTitle>Exportar consolidação</DialogTitle></DialogHeader><div className="flex flex-wrap gap-2"><Button variant="outline" disabled={exporting} onClick={()=>download(false)}><FileText/>Resumida</Button><Button variant="outline" disabled={exporting} onClick={()=>download(true)}><FileText/>Detalhada</Button></div></DialogContent></Dialog>
 </DialogContent></Dialog>;
}