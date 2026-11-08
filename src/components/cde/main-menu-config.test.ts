import { describe, expect, it, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import { parseMenuConfig } from "./main-menu-config";
describe("main menu choices", () => {
  it("keeps the selected icon order without duplicates", () => {
    expect(parseMenuConfig(JSON.stringify({ order: ["password", "back", "logout", "manual", "password"] })).order.slice(0, 4)).toEqual(["password", "back", "logout", "manual"]);
  });
  it("keeps selected hidden actions and starts optional menus hidden", () => {
    expect(parseMenuConfig(JSON.stringify({ hidden: ["back"] })).hidden).toEqual(["back", "portal", "pendentes", "chamados"]);
  });
  it("shows an optional menu once it was saved as visible", () => {
    expect(parseMenuConfig(JSON.stringify({ order: ["pendentes"], hidden: [] })).hidden).not.toContain("pendentes");
  });
});
