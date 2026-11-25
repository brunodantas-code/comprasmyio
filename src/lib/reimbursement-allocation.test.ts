import { describe, expect, it } from "vitest";
import { emptyReimbursementAllocation, groupReimbursementsByAllocation, resolveReimbursementOrderAllocations } from "./reimbursement-allocation";

describe("classificação individual dos reembolsos", () => {
  it("reembolsos com projetos diferentes viram solicitações separadas", () => {
    const a = emptyReimbursementAllocation("projeto", "p1");
    const b = emptyReimbursementAllocation("projeto", "p2");
    expect(groupReimbursementsByAllocation([a, b, { ...a }])).toEqual([[0, 2], [1]]);
  });
  it("mesma classificação mantém uma única solicitação", () => {
    const a = { ...emptyReimbursementAllocation("interna"), costCenterId: "cc" };
    expect(groupReimbursementsByAllocation([a, { ...a }])).toEqual([[0, 1]]);
  });
  it("centro de custo diferente separa a solicitação", () => {
    const a = { ...emptyReimbursementAllocation("cliente"), clientId: "c", costCenterId: "x" };
    expect(groupReimbursementsByAllocation([a, { ...a, costCenterId: "y" }])).toEqual([[0], [1]]);
  });
  it("usa os projetos individuais sem exigir um projeto geral", () => {
    const a = emptyReimbursementAllocation("projeto", "p1");
    const b = emptyReimbursementAllocation("projeto", "p2");
    const projects = [{ id: "p1", client_id: "c1" }, { id: "p2", client_id: "c2" }];
    expect(resolveReimbursementOrderAllocations([a, b, { ...a }], projects)).toEqual([
      { indexes: [0, 2], allocation: { project_id: "p1", client_id: "c1", client_unit_id: null, for_stock: false, allocation_type: "projeto" } },
      { indexes: [1], allocation: { project_id: "p2", client_id: "c2", client_unit_id: null, for_stock: false, allocation_type: "projeto" } },
    ]);
  });
});
