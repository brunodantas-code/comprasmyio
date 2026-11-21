import { describe, expect, it, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import { menuOrderForContext, parseMenuConfig, userInfoLine } from "./main-menu-config";
describe("main menu choices", () => {
  it("keeps favorites visible for existing configurations without changing saved positions", () => {
    const config = parseMenuConfig(JSON.stringify({ order: ["password", "logout"], hidden: [], v: 2 }));
    expect(config.order.slice(0, 2)).toEqual(["password", "logout"]);
    expect(config.order.filter(id => id === "favorites")).toHaveLength(1);
    expect(menuOrderForContext(config)).toContain("favorites");
  });
  it("applies the CDE favorites position in both app and Home menus", () => {
    const config = parseMenuConfig(JSON.stringify({ order: ["favorites", "theme", "logout"], hidden: [], v: 2 }));
    expect(menuOrderForContext(config).slice(0, 3)).toEqual(["favorites", "theme", "logout"]);
    expect(menuOrderForContext(config, true).slice(0, 4)).toEqual(["pendentes", "favorites", "theme", "logout"]);
  });
  it("respects hidden favorites in every menu without hiding Appearance", () => {
    const config = parseMenuConfig(JSON.stringify({ order: ["favorites", "theme"], hidden: ["favorites"], v: 2 }));
    expect(menuOrderForContext(config)).not.toContain("favorites");
    expect(menuOrderForContext(config, true)).not.toContain("favorites");
    expect(menuOrderForContext(config)).toContain("theme");
  });
  it("keeps the selected icon order without duplicates", () => {
    expect(parseMenuConfig(JSON.stringify({ order: ["password", "back", "logout", "manual", "password"] })).order.slice(0, 4)).toEqual(["password", "back", "logout", "manual"]);
  });
  it("keeps selected hidden actions and starts optional menus hidden", () => {
    expect(parseMenuConfig(JSON.stringify({ hidden: ["back"] })).hidden).toEqual(["back", "portal", "chamados", "app_supply", "app_cash_flow", "app_crm", "app_legal", "app_rh", "app_site_survey", "app_opdesk", "app_mytosis", "app_cde"]);
  });
  it("shows Minhas Pendências by default, even if an old config hid it", () => {
    expect(parseMenuConfig(JSON.stringify({ hidden: ["pendentes"] })).hidden).not.toContain("pendentes");
    expect(parseMenuConfig(JSON.stringify({ hidden: ["pendentes"], v: 2 })).hidden).toContain("pendentes");
  });
  it("shows an optional menu once it was saved as visible", () => {
    expect(parseMenuConfig(JSON.stringify({ order: ["chamados"], hidden: [] })).hidden).not.toContain("chamados");
  });
  it("shows only the name by default and the chosen job/profile line", () => {
    expect(parseMenuConfig("{}").userInfo).toBe("name");
    expect(userInfoLine("name", "CFO", "Admin")).toBe("");
    expect(userInfoLine("job", "CFO", "Admin")).toBe("CFO");
    expect(userInfoLine("both", "CFO", "Admin")).toBe("CFO · Admin");
  });
});

describe("Home Page menu context", () => {
  const config = { order: ["back", "portal", "password", "pendentes", "signature", "logout"], hidden: [] } as const;
  const menu = { order: [...config.order], hidden: [] };
  it("omits Voltar and Todos os apps only on Home Page", () => {
    expect(menuOrderForContext(menu, true)).not.toContain("back");
    expect(menuOrderForContext(menu, true)).not.toContain("portal");
    expect(menuOrderForContext(menu)).toEqual([...config.order]);
  });
  it("starts Home Page with Minhas Pendências and preserves the other CDE positions", () => {
    expect(menuOrderForContext(menu, true)).toEqual(["pendentes", "password", "signature", "logout"]);
    expect(menu.order).toEqual([...config.order]);
  });
  it("continues respecting explicitly hidden CDE actions", () => {
    expect(menuOrderForContext({ ...menu, hidden: ["pendentes", "signature"] }, true)).toEqual(["password", "logout"]);
  });
});
