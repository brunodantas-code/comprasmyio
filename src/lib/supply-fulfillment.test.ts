import { describe, expect, it } from "vitest";
import { canConfirmPhysicalReceipt, fulfillmentKind, fulfillmentFilterLabel, hasPhysicalDelivery } from "./supply-fulfillment";

describe("recebimento e atendimento do Supply", () => {
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