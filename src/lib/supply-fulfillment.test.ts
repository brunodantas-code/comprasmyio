import { describe, expect, it } from "vitest";
import { canConfirmPhysicalReceipt, fulfillmentKind, fulfillmentFilterLabel, hasPhysicalDelivery, pendingPhysicalReceiptOrders, showsSupplyDeliveryFields } from "./supply-fulfillment";

describe("recebimento e atendimento do Supply", () => {
  it('não apresenta entrega nos reembolsos, incluindo tipos personalizados e históricos', () => {
    expect(showsSupplyDeliveryFields({request_model:'reembolso',request_type:'despesas-viagem'})).toBe(false);
    expect(showsSupplyDeliveryFields({request_type:'reembolso'})).toBe(false);
    expect(showsSupplyDeliveryFields({request_model:'materiais'})).toBe(true);
  });
  it.each(["reembolso", "pagamento", "servicos", "viagens", "rh"])("não oferece recebimento físico para %s", (request_model) => {
    expect(canConfirmPhysicalReceipt({ request_model, status: "entregue" })).toBe(false);
  });
  it.each(["materiais", "dispositivos", "importacao", "maquinas_equipamentos_e_eletrodometicos"])("preserva recebimento físico para %s", (request_model) => {
    expect(canConfirmPhysicalReceipt({ request_model, status: "entregue" })).toBe(true);
  });
  it("reconhece tipos personalizados pelo modelo, sem exigir o código padrão", () => {
    expect(hasPhysicalDelivery({ request_type: "material-especial", request_model: "materiais" })).toBe(true);
  });
  it("não oferece recebimento antes da entrega", () => {
    expect(canConfirmPhysicalReceipt({ request_model: "materiais", status: "pendente" })).toBe(false);
  });
  it.each(["servicos", "viagens"])("classifica %s como atendidas, não entregues", (request_model) => {
    expect(fulfillmentKind({ request_model })).toBe("attended");
  });
  it.each(["reembolso", "pagamento"])("classifica %s como pagas", (request_model) => {
    expect(fulfillmentKind({ request_model })).toBe("paid");
  });
  it("reúne Entregue / Concluído / Pago somente no filtro da situação final", () => {
    expect(fulfillmentFilterLabel("entregue", "Entregue")).toBe("Entregue / Concluído / Pago");
    expect(fulfillmentFilterLabel("pendente", "Pendente")).toBe("Pendente");
  });
});

describe("pendência de conferência do recebimento", () => {
  const order = { id: "202609170001", requester_id: "Leonardo", recipient_user_id: "Bruno", request_type: "materiais", request_model: "materiais", status: "entregue" };

  it("atribui o pedido Entregue somente ao Solicitante, não ao destinatário ou Compras", () => {
    expect(pendingPhysicalReceiptOrders([order], "Leonardo").map(o => o.id)).toEqual(["202609170001"]);
    expect(pendingPhysicalReceiptOrders([order], "Bruno")).toEqual([]);
    expect(pendingPhysicalReceiptOrders([order], "Alexandre")).toEqual([]);
  });
  it.each(["recebido_ok", "recebido_problema", "pendente", "comprado_aguardando", "cancelado"])("não mantém a conferência no estado %s", status => {
    expect(pendingPhysicalReceiptOrders([{ ...order, status }], "Leonardo")).toEqual([]);
  });
  it.each(["reembolso", "pagamento", "servicos", "viagens", "rh"])("não cria conferência física para %s", request_model => {
    expect(pendingPhysicalReceiptOrders([{ ...order, request_model }], "Leonardo")).toEqual([]);
  });
  it("conta o mesmo pedido somente uma vez", () => {
    expect(pendingPhysicalReceiptOrders([order, order], "Leonardo")).toHaveLength(1);
  });
  it("preserva modelos personalizados e tipos históricos sem modelo", () => {
    expect(pendingPhysicalReceiptOrders([{ ...order, request_type: "material-especial" }], "Leonardo")).toHaveLength(1);
    expect(pendingPhysicalReceiptOrders([{ ...order, request_model: null }], "Leonardo")).toHaveLength(1);
  });
  it("não atribui pendências sem usuário identificado", () => {
    expect(pendingPhysicalReceiptOrders([order], "")).toEqual([]);
  });
});