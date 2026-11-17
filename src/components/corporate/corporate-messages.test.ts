import { describe, expect, it, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import { isMessageActive } from "./corporate-messages";

describe("mensagens corporativas na tela principal", () => {
  it("aparece entre a data de exibição e a de inatividade, inclusive", () => {
    const m = { starts_at: "2026-11-01", ends_at: "2026-11-30" };
    expect(isMessageActive(m, "2026-11-01")).toBe(true);
    expect(isMessageActive(m, "2026-11-30")).toBe(true);
    expect(isMessageActive(m, "2026-12-01")).toBe(false);
    expect(isMessageActive(m, "2026-10-31")).toBe(false);
  });
  it("sem data de inatividade continua exibida", () => {
    expect(isMessageActive({ starts_at: "2026-11-17", ends_at: null }, "2027-05-01")).toBe(true);
  });
});

import { parsePortalSections } from "./portal-sections";
describe("disposição da tela principal", () => {
  it("segue a ordem arrastada no CDE", () => {
    expect(parsePortalSections('["apps","messages","pending","todos"]')).toEqual(["apps", "messages", "pending", "todos"]);
  });
  it("sem escolha salva, mensagens ficam antes dos ícones, depois To Dos e pendências", () => {
    expect(parsePortalSections(null)).toEqual(["messages", "apps", "todos", "pending"]);
  });
  it("blocos não salvos entram no fim e chaves desconhecidas são ignoradas", () => {
    expect(parsePortalSections('["pending","xyz"]')).toEqual(["pending", "messages", "apps", "todos"]);
  });
});
