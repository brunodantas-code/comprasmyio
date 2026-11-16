import {describe,it,expect} from 'vitest';
import {criticalSupplyOrders,dueToday} from './critical-pending';
it('critical group includes only unfinished tasks due today across apps',()=>{expect(dueToday([{id:'Legal',due:'2026-11-10'},{id:'Supply',due:'2026-11-10'},{id:'old',due:'2026-11-09'},{id:'later',due:'2026-11-11'},{id:'done',due:'2026-11-10',completed:true}],'2026-11-10').map(x=>x.id)).toEqual(['Legal','Supply']);});

const today='2026-11-16';
const payment={id:'202610020001',requester_id:'Leonardo',approval_status:'aguardando_aprovacao',status:'pendente',request_model:'pagamento',payment_date:today,created_at:'2026-10-02T19:47:15Z',deadline_type:'customizado',deadline_date:null,delivery_forecast:null};
const step={order_id:payment.id,approver_id:'Alexandre',step_index:1,status:'pendente'};
describe('alertas de aprovação em Prazo crítico',()=>{
 it('mostra a etapa de Alexandre e ignora a aprovação conjunta já decidida',()=>{expect(criticalSupplyOrders([payment],[step,{...step,approver_id:'João',status:'aprovado'}],'Alexandre',false,today).map(o=>o.id)).toEqual(['202610020001']);});
 it.each(['aprovado','rejeitado'])('não alerta aprovação de pedido %s com etapa antiga pendente',approval_status=>{expect(criticalSupplyOrders([{...payment,approval_status}],[step],'Alexandre',false,today)).toEqual([]);});
 it('não alerta decisão da própria solicitação',()=>{expect(criticalSupplyOrders([payment],[{...step,approver_id:'Leonardo'}],'Leonardo',false,today)).toEqual([]);});
 it('não transforma acesso administrativo em pendência do outro aprovador',()=>{expect(criticalSupplyOrders([payment],[step],'Admin',false,today)).toEqual([]);});
 it('não alerta etapas já decididas',()=>{expect(criticalSupplyOrders([payment],[{...step,status:'aprovado'}],'Alexandre',false,today)).toEqual([]);});
 it('aguarda uma etapa anterior ainda pendente',()=>{expect(criticalSupplyOrders([payment],[{...step,step_index:2},{...step,approver_id:'João'}],'Alexandre',false,today)).toEqual([]);});
 it('não bloqueia a próxima etapa por uma decisão anterior encerrada',()=>{expect(criticalSupplyOrders([payment],[{...step,step_index:2},{...step,approver_id:'João',status:'aprovado'}],'Alexandre',false,today)).toEqual([payment]);});
 it('limita o alerta ao vencimento de hoje',()=>{expect(criticalSupplyOrders([{...payment,payment_date:'2026-11-17'}],[step],'Alexandre',false,today)).toEqual([]);});
 it.each(['cancelado','entregue','recebido_ok','pago','conciliado'])('não gera alerta de aprovação para registro encerrado %s',status=>{expect(criticalSupplyOrders([{...payment,status}],[step],'Alexandre',false,today)).toEqual([]);});
 it('mantém execução de serviço aprovado para Compras, mesmo quando é o solicitante',()=>{const service={...payment,request_model:'servicos',approval_status:'aprovado',deadline_date:today};expect(criticalSupplyOrders([service],[{...step,approver_id:'Leonardo'}],'Leonardo',true,today)).toEqual([service]);expect(criticalSupplyOrders([service],[step],'Alexandre',false,today)).toEqual([]);});
 it('não transforma pagamento aprovado em execução de compra',()=>{expect(criticalSupplyOrders([{...payment,approval_status:'aprovado'}],[step],'Alexandre',true,today)).toEqual([]);});
 it('não altera solicitações nem etapas ao calcular os alertas',()=>{const before=JSON.stringify({payment,step});criticalSupplyOrders([payment],[step],'Alexandre',false,today);expect(JSON.stringify({payment,step})).toBe(before);});
});
