import { describe, expect, it } from "vitest";
import { emptyReimbursementAllocation, groupReimbursementsByAllocation } from "./reimbursement-allocation";

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
});
