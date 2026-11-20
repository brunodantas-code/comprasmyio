type Request = { request_type?: string | null; request_model?: string | null; status?: string };
const physicalModels = new Set(["materiais", "dispositivos", "importacao", "maquinas_equipamentos_e_eletrodometicos"]);

export function showsSupplyDeliveryFields(order: Request): boolean {
  return order.request_model !== 'reembolso' && order.request_type !== 'reembolso';
}

export function hasPhysicalDelivery(order: Request): boolean {
  return physicalModels.has(order.request_model || order.request_type || "");
}

export function canConfirmPhysicalReceipt(order: Request): boolean {
  return order.status === "entregue" && hasPhysicalDelivery(order);
}

export function pendingPhysicalReceiptOrders<T extends Request & { id: string; requester_id: string }>(orders: readonly T[], userId: string): T[] {
  if (!userId) return [];
  return [...new Map(orders.filter(order => order.requester_id === userId && canConfirmPhysicalReceipt(order)).map(order => [order.id, order])).values()];
}

export function fulfillmentKind(order: Request): "delivered" | "attended" | "paid" {
  if (hasPhysicalDelivery(order)) return "delivered";
  return ["pagamento", "reembolso"].includes(order.request_model || order.request_type || "") ? "paid" : "attended";
}

export function fulfillmentFilterLabel(status: string, label: string): string {
  return status === "entregue" ? "Entregue / Concluído / Pago" : label;
}