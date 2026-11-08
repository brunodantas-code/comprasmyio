import { describe, expect, it, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import { parseMenuConfig } from "./main-menu-config";
describe("main menu choices", () => {
  it("keeps the selected icon order without duplicates", () => {
    expect(parseMenuConfig(JSON.stringify({ order: ["password", "back", "logout", "manual", "password"] })).order).toEqual(["password", "back", "logout", "manual"]);
  });
  it("keeps selected hidden actions separate from order", () => {
    expect(parseMenuConfig(JSON.stringify({ hidden: ["back"] })).hidden).toEqual(["back"]);
  });
});