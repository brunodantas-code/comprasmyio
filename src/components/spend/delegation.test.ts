import { describe, expect, it } from "vitest";
import { receiptCardsFor, isDelegatedCard } from "./delegation";
import type { Delegation, SpendCard } from "./data";
const card = (id: string, holder: string) => ({ id, holder_id: holder }) as SpendCard;
const del = (card_id: string, delegate_id: string, expires_at: string, revoked_at: string | null = null) => ({ card_id, delegate_id, expires_at, revoked_at }) as Delegation;
describe("autorização temporária", () => {
  const cards = [card("a", "u1"), card("b", "u2"), card("c", "u3")];
  it("inclui cartão autorizado dentro da validade", () => expect(receiptCardsFor("u1", cards, [del("b", "u1", "2026-11-30")], "2026-11-24").map(c => c.id)).toEqual(["a", "b"]));
  it("exclui autorização vencida ou revogada", () => expect(receiptCardsFor("u1", cards, [del("b", "u1", "2026-11-23"), del("c", "u1", "2026-12-01", "x")], "2026-11-24").map(c => c.id)).toEqual(["a"]));
  it("não usa autorização de outra pessoa", () => expect(receiptCardsFor("u1", cards, [del("b", "u9", "2026-12-01")], "2026-11-24").map(c => c.id)).toEqual(["a"]));
  it("Financeiro não é tratado como autorizado", () => expect(isDelegatedCard(cards[1], "u1", true)).toBe(false));
});
