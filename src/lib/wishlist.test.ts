import { describe, expect, it } from "vitest";
import { canAnswerWishlistQuestion, canEditWishlistIdea, unansweredWishlistQuestions, wishlistIdeaSchema, wishlistProjectExport, wishlistSummary, type WishlistIdea, type WishlistMessage, type WishlistStep } from "./wishlist";

const idea = { id: "wish", idealizer_id: "owner", title: "Inovação", description: "Uma ideia nova", expected_result: "Resultado", created_at: "2026-11-13", status: "ideia" } as WishlistIdea;
const question = { id: "q1", idea_id: "wish", author_id: "owner", recipient_id: "person", message_type: "question", parent_message_id: null, message: "Como implementar?" } as WishlistMessage;
describe("Wishlist compartilhado de inovação", () => {
  it("aceita desejos de inovação, mas não categorias de bugs ou melhorias", () => {
    const values = { title: "Ideia nova", description: "Descrição da inovação", expected_result: "", status: "ideia" };
    expect(wishlistIdeaSchema.safeParse(values).success).toBe(true);
    expect(wishlistIdeaSchema.safeParse({ ...values, status: "bug" }).success).toBe(false);
    expect(wishlistIdeaSchema.safeParse({ ...values, status: "melhoria" }).success).toBe(false);
  });
  it("retira o resumo da descrição sem quebras de linha", () => {
    expect(wishlistSummary("Uma\n  ideia\tde inovação")).toBe("Uma ideia de inovação");
    expect(wishlistSummary("Uma ideia de inovação", 10)).toBe("Uma ideia…");
  });
  it("mantém o idealizador como editor e permite contribuições sem alterar a autoria", () => {
    expect(canEditWishlistIdea(idea, "owner", false)).toBe(true);
    expect(canEditWishlistIdea(idea, "person", false)).toBe(false);
    expect(canEditWishlistIdea(idea, "admin", true)).toBe(true);
  });
  it("vincula a resposta à pergunta e somente ao destinatário", () => {
    expect(canAnswerWishlistQuestion(question, "person", [question])).toBe(true);
    expect(canAnswerWishlistQuestion(question, "owner", [question])).toBe(false);
    expect(canAnswerWishlistQuestion(question, "other", [question])).toBe(false);
    const answer = { ...question, id: "answer", message_type: "answer", parent_message_id: "q1" } as WishlistMessage;
    expect(unansweredWishlistQuestions([question, answer])).toEqual([]);
    expect(canAnswerWishlistQuestion(question, "person", [question, answer])).toBe(false);
  });
  it("exporta roadmap e conversa para myio Projects sem etapas removidas ou de outro desejo", () => {
    const base: WishlistStep = { id: "first", idea_id: "wish", title: "Planejar", position: 1, description: "", completed: false, completed_at: null, created_at: "2026-11-13", updated_at: "2026-11-13", deleted_at: null, due_date: null, responsible_id: null };
    const steps = [{ ...base, id: "second", title: "Piloto", position: 2 }, base, { ...base, id: "removed", deleted_at: "2026-11-13" }, { ...base, id: "other", idea_id: "other" }];
    const result = wishlistProjectExport(idea, steps, [question], "Idealizador");
    expect(result.destination).toBe("myio Projects");
    expect(result.idealizer).toEqual({ id: "owner", name: "Idealizador" });
    expect(result.roadmap.map(s => s.id)).toEqual(["first", "second"]);
    expect(result.conversation.map(m => m.id)).toEqual(["q1"]);
  });
});