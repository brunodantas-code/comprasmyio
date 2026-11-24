import { describe, expect, it } from "vitest";
import { receiptCardsFor, receiptDisplayCardsFor, isDelegatedCard } from "./delegation";
import type { Delegation, SpendCard } from "./data";
const card = (id: string, holder: string) => ({ id, holder_id: holder }) as SpendCard;
const del = (card_id: string, delegate_id: string, expires_at: string, revoked_at: string | null = null) => ({ card_id, delegate_id, expires_at, revoked_at }) as Delegation;
describe("autorização temporária", () => {
  const cards = [card("a", "u1"), card("b", "u2"), card("c", "u3")];
  it("inclui cartão autorizado dentro da validade", () => expect(receiptCardsFor("u1", cards, [del("b", "u1", "2026-11-30")], "2026-11-24").map(c => c.id)).toEqual(["a", "b"]));
  it("exclui autorização vencida ou revogada", () => expect(receiptCardsFor("u1", cards, [del("b", "u1", "2026-11-23"), del("c", "u1", "2026-12-01", "x")], "2026-11-24").map(c => c.id)).toEqual(["a"]));
  it("não usa autorização de outra pessoa", () => expect(receiptCardsFor("u1", cards, [del("b", "u9", "2026-12-01")], "2026-11-24").map(c => c.id)).toEqual(["a"]));
  it("Financeiro não é tratado como autorizado", () => expect(isDelegatedCard(cards[1], "u1", true)).toBe(false));
  it("mostra somente 8891 como cartão de Leonardo sem alterar o cadastro 9055", () => {
    const user = "6ca0eff8-7393-47bc-9054-9001138bcbc2";
    const source = [
      { ...card("25a95170-6998-4109-a020-ab102531dff9", user), last_four: "9055" },
      { ...card("96e76c5f-5228-41db-99ba-66ee1c3e9e92", user), last_four: "8891" },
    ];
    expect(receiptCardsFor(user, source, [], "2026-11-24").map(c => c.last_four)).toEqual(["8891"]);
    expect(receiptDisplayCardsFor(user, source).map(c => c.last_four)).toEqual(["8891"]);
    expect(source.map(c => c.last_four)).toEqual(["9055", "8891"]);
    expect(receiptDisplayCardsFor("outro-usuario", source)).toHaveLength(2);
  });
});
