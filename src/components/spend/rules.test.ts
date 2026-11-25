import { describe, it, expect } from "vitest";
import { canMatch, expenseSchema, recurringWarning } from "./rules";
const id = "00000000-0000-4000-8000-000000000001";
const draft = { id, card_id: id, date: "2026-11-22", amount: 42.90, merchant: "Uber", category: "alimentacao", observation: "", project_id: null, file_path: "empresa/2026-11/cartao/recibo.jpg", clear_photo: false, myio_cnpj: true, confirmed: true as const, payment_source: "myio_card" };
describe("Spend regras", () => {
  const a = { card_id: id, date: "2026-11-22", amount: 42.90, final_cartao: "1234" };
  it("concilia em até dois dias", () => { expect(canMatch(a, { ...a, date: "2026-11-20" })).toBe(true); expect(canMatch(a, { ...a, date: "2026-11-25" })).toBe(false); });
  it("exige valor exato", () => expect(canMatch(a, { ...a, amount: 42.91 })).toBe(false));
  it("não concilia reembolso com a fatura mesmo com cartão, valor e data iguais", () => {
    expect(canMatch(a, { ...a, payment_source: "reimbursement" })).toBe(false);
    expect(canMatch(a, { ...a, payment_source: "myio_card" })).toBe(true);
  });
  it("exige informar se o pagamento é cartão myio ou reembolso", () => {
    expect(expenseSchema.safeParse({ ...draft, payment_source: "" }).success).toBe(false);
    expect(expenseSchema.safeParse({ ...draft, payment_source: undefined }).success).toBe(false);
    expect(expenseSchema.safeParse({ ...draft, payment_source: "reimbursement" }).success).toBe(true);
    expect(expenseSchema.safeParse(draft).success).toBe(true);
  });
  it("permite adiantamento sem cartão e impede vínculo de cartão à prestação", () => {
    expect(expenseSchema.safeParse({ ...draft, payment_source: "advance", card_id: null, file_path: `advances/${id}/2026-11/recibo.jpg` }).success).toBe(true);
    expect(expenseSchema.safeParse({ ...draft, payment_source: "advance", card_id: id }).success).toBe(false);
    expect(expenseSchema.safeParse({ ...draft, card_id: null }).success).toBe(false);
  });
  it("exige final de cartão e cartão do portador", () => { expect(canMatch(a, { ...a, final_cartao: "5678" })).toBe(false); expect(canMatch(a, { ...a, card_id: "outro" })).toBe(false); });
  it("Insumos exige projeto", () => { expect(expenseSchema.safeParse({ ...draft, category: "insumos" }).success).toBe(false); expect(expenseSchema.safeParse({ ...draft, category: "insumos", project_id: id }).success).toBe(true); });
  it("Serviços exige observação", () => { expect(expenseSchema.safeParse({ ...draft, category: "servicos" }).success).toBe(false); expect(expenseSchema.safeParse({ ...draft, category: "servicos", observation: "Manutenção" }).success).toBe(true); });
  it("Outros exige especificação", () => expect(expenseSchema.safeParse({ ...draft, category: "outros", observation: "  " }).success).toBe(false));
  it("Ferramentas exige confirmação de foto nítida", () => { expect(expenseSchema.safeParse({ ...draft, category: "ferramentas" }).success).toBe(false); expect(expenseSchema.safeParse({ ...draft, category: "ferramentas", clear_photo: true }).success).toBe(true); });
  it("exige confirmação de todas as informações antes de salvar", () => { expect(expenseSchema.safeParse({ ...draft, confirmed: false }).success).toBe(false); expect(expenseSchema.safeParse(draft).success).toBe(true); });
  it("exige confirmação de Com ou Sem CNPJ myio", () => { expect(expenseSchema.safeParse({ ...draft, myio_cnpj: null }).success).toBe(false); expect(expenseSchema.safeParse({ ...draft, myio_cnpj: false }).success).toBe(true); });
  it("IA alerta repetição no mesmo mês", () => { expect(recurringWarning("ia", "OpenAI", "2026-11-22", [{ category: "ia", merchant: "OpenAI", date: "2026-11-01" }])).toBe(true); expect(recurringWarning("ia", "OpenAI", "2026-11-22", [{ category: "ia", merchant: "OpenAI", date: "2026-10-01" }])).toBe(false); });
});
