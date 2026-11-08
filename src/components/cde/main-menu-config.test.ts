import { describe, expect, it, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import { parseMenuConfig } from "./main-menu-config";
describe("main menu choices", () => {
  it("keeps the selected icon order without duplicates", () => {
    expect(parseMenuConfig(JSON.stringify({ order: ["password", "back", "logout", "manual", "password"] })).order.slice(0, 4)).toEqual(["password", "back", "logout", "manual"]);
  });
  it("keeps selected hidden actions and starts optional menus hidden", () => {
    expect(parseMenuConfig(JSON.stringify({ hidden: ["back"] })).hidden).toEqual(["back", "portal", "chamados"]);
  });
  it("shows Minhas Pendências by default, even if an old config hid it", () => {
    expect(parseMenuConfig(JSON.stringify({ hidden: ["pendentes"] })).hidden).not.toContain("pendentes");
    expect(parseMenuConfig(JSON.stringify({ hidden: ["pendentes"], v: 2 })).hidden).toContain("pendentes");
  });
  it("shows an optional menu once it was saved as visible", () => {
    expect(parseMenuConfig(JSON.stringify({ order: ["chamados"], hidden: [] })).hidden).not.toContain("chamados");
  });
});
