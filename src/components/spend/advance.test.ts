import { describe, expect, it } from "vitest";
import { advanceAcceptsAmount, advanceBalance, advanceCloseRequirement } from "./advance";

const advance = { id: "a1", amount: 1000, status: "open" };
const receipts = [
  { advance_id: "a1", amount: 300, status: "approved" },
  { advance_id: "a1", amount: 200.5, status: "pending" },
  { advance_id: "other", amount: 999, status: "approved" },
];

describe("adiantamento de despesas", () => {
  it("abate os comprovantes enviados do saldo adiantado", () => {
    expect(advanceBalance(advance, receipts)).toMatchObject({ sent: 500.5, approved: 300, pendingReview: 200.5, remaining: 499.5, count: 2 });
  });
  it("aceita comprovante até o saldo exato e bloqueia o excedente", () => {
    expect(advanceAcceptsAmount(advance, receipts, 499.5)).toBe(true);
    expect(advanceAcceptsAmount(advance, receipts, 499.51)).toBe(false);
  });
  it("na edição desconsidera o valor anterior do próprio comprovante", () => {
    expect(advanceAcceptsAmount(advance, receipts, 700, { advance_id: "a1", amount: 200.5 })).toBe(true);
  });
  it("não aceita comprovantes em prestação encerrada", () => {
    expect(advanceAcceptsAmount({ ...advance, status: "settled" }, [], 10)).toBe(false);
  });
  it("exige aprovar pendentes e resolver saldo antes de encerrar", () => {
    expect(advanceCloseRequirement(advance, receipts)).toBe("pending_receipts");
    expect(advanceCloseRequirement(advance, [{ advance_id: "a1", amount: 400, status: "approved" }])).toBe("balance_resolution");
    expect(advanceCloseRequirement(advance, [{ advance_id: "a1", amount: 1000, status: "approved" }])).toBe("settled");
  });
});
