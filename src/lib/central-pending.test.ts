import {describe,it,expect} from 'vitest';
import {blockers,milestoneDone,wouldCycle,centralItems,centralPendingItems,criticality,type CentralItem,type CentralSnapshot,type Dependency} from './central-pending';
const item=(kind:CentralItem['kind'],id:string):CentralItem=>({kind,sourceId:id,key:`${kind}:${id}`,title:id,app:kind==='supply'?'Supply':'Legal',route:'',recordId:id,status:'pendente',completed:false,canceled:false,due:null,priority:'media',users:[],reasons:{}});
const d:Dependency={id:'d',predecessor_kind:'supply',predecessor_id:'TV',successor_kind:'legal_action',successor_id:'install',milestone:'received'};
describe('Central dependencies',()=>{
 it('does not duplicate an unassigned Code ticket across Admin queues',()=>{const s={users:[{id:'Leonardo',full_name:'Leonardo',code_admin:true,code_access:true,buyer:false},{id:'Joao',full_name:'Joao',code_admin:true,code_access:true,buyer:false}],code:[{id:'unassigned',ticket_number:52,title:'Sem vínculo',reporter_id:'someone',assignee_id:null,status:'aberto',created_at:'2026-11-16',priority:'media',urgency:'normal'}],codeMessages:[],orders:[],steps:[],supplyMessages:[],records:[],confidential:[],actions:[],completions:[],nodes:[],tasks:[],nodeMessages:[],taskMessages:[],support:[],deletions:[],dependencies:[],logs:[]} satisfies CentralSnapshot;expect(centralItems(s)[0]?.users).toEqual([]);});
 it('approval does not release Bruno installation before Alexandre TV receipt',()=>{const tv={...item('supply','TV'),approval:'aprovado'};expect(blockers(item('legal_action','install'),[tv],[d])).toHaveLength(1);expect(blockers(item('legal_action','install'),[{...tv,status:'recebido_ok'}],[d])).toHaveLength(0);});
 it('canceled and missing predecessor never release successor',()=>{expect(milestoneDone({...item('supply','TV'),completed:true,canceled:true},'received')).toBe(false);expect(milestoneDone(undefined,'completed')).toBe(false);});
 it('rejects cyclic links between apps',()=>{expect(wouldCycle([d],'legal_action:install','supply:TV')).toBe(true);expect(wouldCycle([d],'code:other','supply:TV')).toBe(false);});
 it('personal To Dos have no source or contribution in admin snapshot',()=>{const s={users:[],code:[],codeMessages:[],orders:[],steps:[],supplyMessages:[],records:[],confidential:[],actions:[],completions:[],nodes:[],tasks:[],nodeMessages:[],taskMessages:[],support:[],deletions:[],dependencies:[],logs:[],personal_todos:[{id:'private'}]} as CentralSnapshot;expect(centralItems(s)).toEqual([]);});
 it('does not assign Code attendance to another admin when assigned',()=>{const s={users:[{id:'Leonardo',full_name:'Leonardo',code_admin:true,code_access:true,buyer:false},{id:'Joao',full_name:'Joao',code_admin:true,code_access:true,buyer:false}],code:[{id:'19',ticket_number:19,title:'Ticket',reporter_id:'someone',assignee_id:'Leonardo',status:'aberto',created_at:'2026-11-10',priority:'media',urgency:'normal'}],codeMessages:[],orders:[],steps:[],supplyMessages:[],records:[],confidential:[],actions:[],completions:[],nodes:[],tasks:[],nodeMessages:[],taskMessages:[],support:[],deletions:[],dependencies:[],logs:[]} satisfies CentralSnapshot;expect(centralItems(s)[0]?.users).toEqual(['Leonardo']);});
 it('completion milestone releases a completed payment without receipt status',()=>{expect(milestoneDone({...item('supply','payment'),status:'pago',completed:true},'completed')).toBe(true);});
 it('uses CDE legal critical deadline independently from priority',()=>{expect(criticality({...item('legal_action','a'),due:'2026-11-13'},'2026-11-10',3)).toBe(3);expect(criticality({...item('legal_action','a'),due:'2026-11-13'},'2026-11-10',2)).toBe(1);});
});

const payment:CentralSnapshot['orders'][number]={id:'202610020001',approval_number:'202610020001',item_name:'NF Resorte',requester_id:'Leonardo',recipient_user_id:null,request_type:'pagamento',request_model:'pagamento',approval_status:'aguardando_aprovacao',status:'pendente',created_at:'2026-10-02T19:47:15Z',deadline_type:'customizado',deadline_date:null,delivery_forecast:null};
const finance={id:'finance',order_id:payment.id,approver_id:'Alexandre',status:'pendente',step_index:1,role_label:'Financeiro'};
function snapshot(order=payment):CentralSnapshot{return {users:[{id:'Alexandre',full_name:'Alexandre',code_admin:false,code_access:true,buyer:false},{id:'Leonardo',full_name:'Leonardo',code_admin:true,code_access:true,buyer:true}],orders:[order],steps:[finance,{...finance,id:'joint',approver_id:'João',status:'aprovado',role_label:'CEO'}],code:[],codeMessages:[],supplyMessages:[],records:[],confidential:[],actions:[],completions:[],nodes:[],tasks:[],nodeMessages:[],taskMessages:[],support:[],deletions:[],dependencies:[],logs:[]};}
describe('aprovações no painel da Central',()=>{
 it('mantém NF Resorte somente para Alexandre, preservando a aprovação conjunta',()=>{const s=snapshot();expect(centralItems(s)[0]?.users).toEqual(['Alexandre']);expect(centralItems(s)[0]?.reasons).toEqual({Alexandre:'Financeiro'});expect(s.steps[1]?.status).toBe('aprovado');});
 it.each(['aprovado','rejeitado'])('não atribui uma etapa antiga de pagamento %s',approval_status=>{expect(centralItems(snapshot({...payment,approval_status}))[0]?.users).toEqual([]);});
 it('retira rejeitado sem outra tarefa da lista, mantendo o registro para histórico e dependências',()=>{const all=centralItems(snapshot({...payment,approval_status:'rejeitado'}));expect(centralPendingItems(all)).toEqual([]);expect(all[0]?.status).toBe('pendente');expect(all[0]?.approval).toBe('rejeitado');expect(milestoneDone(all[0],'approved')).toBe(false);});
 it('não atribui aprovação ao próprio solicitante',()=>{const s=snapshot();s.steps=[{...finance,approver_id:'Leonardo'}];expect(centralItems(s)[0]?.users).toEqual([]);});
 it('mantém a execução do serviço aprovado, sem reaproveitar uma etapa antiga de aprovação',()=>{const s=snapshot({...payment,request_type:'servicos',request_model:'servicos',approval_status:'aprovado'});const all=centralItems(s);expect(all[0]?.users).toEqual(['Leonardo']);expect(all[0]?.reasons).toEqual({Leonardo:'Execução de compra/serviço'});expect(centralPendingItems(all)).toHaveLength(1);});
 it('não antecipa etapas posteriores enquanto a primeira está pendente',()=>{const s=snapshot();s.steps=[finance,{...finance,id:'later',step_index:2,approver_id:'João'}];expect(centralItems(s)[0]?.users).toEqual(['Alexandre']);});
 it.each(['pago','conciliado','cancelado'])('não atribui etapas antigas a pagamento encerrado %s',status=>{const s=snapshot();s.payments=[{source_order_id:payment.id,status,due_date:'2026-11-16'}];expect(centralItems(s)[0]?.users).toEqual([]);expect(centralPendingItems(centralItems(s))).toEqual([]);});
 it('preserva uma pergunta separada de um pedido rejeitado, sem atribuir aprovação',()=>{const s=snapshot({...payment,approval_status:'rejeitado'});s.supplyMessages=[{id:'question',order_id:payment.id,author_id:'Leonardo',recipient_id:'Alexandre',message_type:'question',parent_message_id:null}];const all=centralItems(s);expect(all[0]?.reasons).toEqual({Alexandre:'Responder pergunta'});expect(centralPendingItems(all)).toHaveLength(1);});
 it('não altera o histórico ao calcular atribuições e contagens',()=>{const s=snapshot();const before=JSON.stringify(s);centralPendingItems(centralItems(s));expect(JSON.stringify(s)).toBe(before);});
});

describe('conferência de recebimento na Central Admin', () => {
 const delivered = { ...payment, id: '202609170001', approval_number: '202609170001', item_name: 'Copos de Vidro', request_type: 'materiais', request_model: 'materiais', status: 'entregue', approval_status: 'aprovado', recipient_user_id: 'Bruno' };
 it('inclui o pedido Entregue apenas para o Solicitante, mesmo sendo Comprador', () => {
   const pending = centralPendingItems(centralItems(snapshot(delivered)));
   expect(pending).toHaveLength(1);
   expect(pending[0]?.sourceId).toBe('202609170001');
   expect(pending[0]?.users).toEqual(['Leonardo']);
   expect(Object.keys(pending[0]?.reasons ?? {})).toEqual(['Leonardo']);
   expect(pending[0]?.receiptPending).toBe(true);
 });
 it.each(['recebido_ok', 'recebido_problema'])('retira a conferência após %s', status => {
   const all = centralItems(snapshot({ ...delivered, status }));
   expect(all[0]?.receiptPending).not.toBe(true);
   expect(centralPendingItems(all).filter(i => i.receiptPending)).toEqual([]);
   if (status === 'recebido_problema') {
     expect(all[0]?.users).toEqual(['Leonardo']);
     expect(all[0]?.reasons['Leonardo']).toBe('Execução de compra/serviço');
   } else {
     expect(all[0]?.users).toEqual([]);
     expect(centralPendingItems(all)).toEqual([]);
   }
 });
 it.each(['servicos', 'viagens', 'pagamento', 'reembolso', 'rh'])('não cria conferência física de %s', request_model => {
   expect(centralPendingItems(centralItems(snapshot({ ...delivered, request_model })))).toEqual([]);
 });
 it('preserva os marcos existentes de entrega para dependências', () => {
   const row = centralItems(snapshot(delivered))[0];
   expect(row?.completed).toBe(true);
   for (const milestone of ['completed', 'purchased', 'received']) expect(milestoneDone(row, milestone)).toBe(true);
 });
});
