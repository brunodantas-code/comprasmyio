import { describe, expect, it } from "vitest";
import { pendingApprovalSteps } from "./approval-pending";

const payment = {
  order_id: "202610020001",
  step_index: 1,
  approver_id: "Alexandre",
  status: "pendente",
  purchase_orders: { requester_id: "Leonardo", approval_status: "aguardando_aprovacao", status: "pendente" },
};

describe("aprovações pessoais", () => {
  it("mantém a NF Resorte atribuída a Alexandre mesmo com aprovação conjunta já decidida", () => {
    const joint = { ...payment, approver_id: "CEO", status: "aprovado" };
    expect(pendingApprovalSteps([payment, joint], "Alexandre")).toEqual([payment]);
  });
  it("não oferece aprovação de uma solicitação inacessível como se valesse zero", () => {
    expect(pendingApprovalSteps([{ ...payment, purchase_orders: null }], "Alexandre")).toEqual([]);
  });
  it("não permite aprovar a própria solicitação", () => {
    expect(pendingApprovalSteps([{ ...payment, approver_id: "Leonardo" }], "Leonardo")).toEqual([]);
  });
  it("não transforma acesso administrativo em pendência pessoal de outro aprovador", () => {
    expect(pendingApprovalSteps([payment], "Admin")).toEqual([]);
  });
  it("aguarda a decisão das etapas anteriores", () => {
    expect(pendingApprovalSteps([{ ...payment, step_index: 2 }, { ...payment, approver_id: "CEO" }], "Alexandre")).toEqual([]);
  });
  it("aceita etapas paralelas na mesma posição", () => {
    expect(pendingApprovalSteps([payment, { ...payment, approver_id: "CEO" }], "Alexandre")).toEqual([payment]);
  });
  it.each(["aprovado", "rejeitado"])("retira a pendência depois da decisão %s", (approval_status) => {
    expect(pendingApprovalSteps([{ ...payment, purchase_orders: { ...payment.purchase_orders, approval_status } }], "Alexandre")).toEqual([]);
  });
  it("não mantém solicitações canceladas na contagem", () => {
    expect(pendingApprovalSteps([{ ...payment, purchase_orders: { ...payment.purchase_orders, status: "cancelado" } }], "Alexandre")).toEqual([]);
  });
});