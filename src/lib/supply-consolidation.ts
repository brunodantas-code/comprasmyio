export type ConsolidationOrder = { id:string; request_model?:string; request_type:string; approval_status?:string; status:string; requester_id:string; approval_number?:string|null; created_at:string; project_id:string|null; client_id?:string|null; allocation_type?:string|null; for_stock:boolean; item_name:string; quantity:number; estimated_value?:number; material_id:string|null; terceiros_material_id:string|null; tool_asset_id?:string|null };
export type ConsolidationItem = { id:string; order_id:string; item_name:string; quantity:number; estimated_unit_value:number; material_id:string|null; terceiros_material_id:string|null; tool_asset_id:string|null; fulfillment_type:string };
export type CatalogItem = { id:string; name:string; origin:string; purchase_type:string|null; code:string|null };
export type Demand = { id:string; orderId:string; number:string; itemKey:string; item:string; code:string; origin:string; market:string; unit:string; quantity:number; unitValue:number|null; total:number|null; requesterId:string; requester:string; destination:string; date:string; state:string };
export type DemandGroup = { key:string; label:string; rows:Demand[]; quantity:number; total:number; missingValue:boolean; orders:number; requesters:number; origin:string; market:string; unit:string };
export function quotationEligible(order:ConsolidationOrder, state:'approved'|'pending') { return (order.request_model==='materiais'||(!order.request_model&&order.request_type==='materiais')) && order.status==='pendente' && order.approval_status===(state==='approved'?'aprovado':'aguardando_aprovacao'); }
export function consolidateDemands(orders:ConsolidationOrder[],items:ConsolidationItem[],catalog:Map<string,CatalogItem>,requesterName:(id:string)=>string,destination:(order:ConsolidationOrder)=>string,state:'approved'|'pending'):Demand[] {
 const result:Demand[]=[]; const seen=new Set<string>();
 for(const order of orders) {
  if(seen.has(order.id)||!quotationEligible(order,state))continue;seen.add(order.id);
  const childItems=items.filter(i=>i.order_id===order.id);
  const source=childItems.length?childItems:[{id:`order-${order.id}`,order_id:order.id,item_name:order.item_name,quantity:order.quantity,estimated_unit_value:order.quantity>0?(order.estimated_value||0)/order.quantity:0,material_id:order.material_id,terceiros_material_id:order.terceiros_material_id,tool_asset_id:order.tool_asset_id||null,fulfillment_type:'purchase'}];
  for(const item of source) {
   if(item.fulfillment_type!=='purchase')continue;
   const identity=item.material_id?`materials:${item.material_id}`:item.terceiros_material_id?`terceiros:${item.terceiros_material_id}`:item.tool_asset_id?`tools:${item.tool_asset_id}`:`legacy:${item.id}`;
   const registered=catalog.get(identity);const origin=registered?.origin||'Sem cadastro';const market=registered?.purchase_type==='importacao'?'Importação':'Nacional';
   const unitValue=item.estimated_unit_value>0?item.estimated_unit_value:null;
   result.push({id:item.id,orderId:order.id,number:order.approval_number||order.id.slice(0,8),itemKey:`${identity}:${origin}:${market}`,item:registered?.name||item.item_name,code:registered?.code||'—',origin,market,unit:'Não informada',quantity:item.quantity,unitValue,total:unitValue===null?null:unitValue*item.quantity,requesterId:order.requester_id,requester:requesterName(order.requester_id),destination:destination(order),date:order.created_at.slice(0,10),state:state==='approved'?'Liberado para cotação':'Não liberado para compra'});
  }
 }
 return result;
}
export function demandGroups(rows:Demand[],mode:'item'|'requester'):DemandGroup[] {
 const groups=new Map<string,Demand[]>();
 for(const row of rows){const key=mode==='item'?row.itemKey:`${row.requesterId}:${row.origin}:${row.market}`;const current=groups.get(key)||[];current.push(row);groups.set(key,current);}
 return [...groups].map(([key,list])=>{const first=list[0];return {key,label:mode==='item'?first.item:first.requester,rows:list.sort((a,b)=>a.item.localeCompare(b.item,'pt-BR')||a.requester.localeCompare(b.requester,'pt-BR')||a.date.localeCompare(b.date)),quantity:list.reduce((n,r)=>n+r.quantity,0),total:list.reduce((n,r)=>n+(r.total||0),0),missingValue:list.some(r=>r.total===null),orders:new Set(list.map(r=>r.orderId)).size,requesters:new Set(list.map(r=>r.requesterId)).size,origin:first.origin,market:first.market,unit:first.unit};}).sort((a,b)=>a.market.localeCompare(b.market)||a.origin.localeCompare(b.origin)||a.label.localeCompare(b.label,'pt-BR'));
}