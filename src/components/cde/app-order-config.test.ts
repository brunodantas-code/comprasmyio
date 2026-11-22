import { describe, expect, it, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import { appDisplay, appKeyForName, appTileColorVars, appTileLowContrast, homeHeaderVars, homeHeaderLogoTone, mobileTileVars, parseAppTile } from "./app-order-config";

describe("app spacing configuration", () => {
  it("stores desktop header height without changing mobile icon dimensions", () => {
    const c = parseAppTile('{"desktopHeaderPx":120,"mobileTilePct":100}');
    expect(homeHeaderVars(c)["--home-header-desktop-height"]).toBe("120px");
    expect(mobileTileVars(c)["--mobile-tile-size"]).toBe("80px");
  });
  it("adds spacing to legacy choices without changing their selected tile appearance", () => {
    expect(parseAppTile('{"labelPx":13,"iconPct":100,"tilePct":100}')).toEqual({ labelPx: 13, iconPct: 100, tilePct: 100, mobileTilePct: 100, mobileIconPct: 100, gapX: 32, gapY: 40, headerBg: "padrao", bg: "padrao", fill: "padrao", border: "padrao", symbol: "padrao", inside: "padrao", below: "padrao" });
  });
  it("reads saved horizontal and vertical spacing independently", () => {
    const config = parseAppTile('{"gapX":36,"gapY":44}');
    expect(config.gapX).toBe(36);
    expect(config.gapY).toBe(44);
  });
  it("falls back for invalid spacing", () => {
    const config = parseAppTile('{"gapX":-4,"gapY":null}');
    expect(config.gapX).toBe(32);
    expect(config.gapY).toBe(40);
  });
  it("keeps desktop and mobile tile sizes independent", () => {
    const c = parseAppTile('{"tilePct":90,"mobileTilePct":80,"iconPct":110,"mobileIconPct":75}');
    expect([c.tilePct, c.mobileTilePct, c.iconPct, c.mobileIconPct]).toEqual([90,80,110,75]);
    expect(mobileTileVars(c)["--mobile-tile-size"]).toBe("64px");
  });
});
describe("portal colours from the myio brand manual", () => {
  it("preserves the existing mobile and desktop header until a colour is chosen", () => {
    const c = parseAppTile('{"bg":"branco"}');
    expect(homeHeaderVars(c)).toEqual({});
    expect(homeHeaderLogoTone(c, true)).toBe("light");
    expect(homeHeaderLogoTone(c)).toBe("auto");
  });
  it("reads the same saved header colour independently of the page background", () => {
    const c = parseAppTile('{"headerBg":"verde_claro","bg":"branco"}');
    expect(homeHeaderVars(c)["--home-header-bg"]).toBe("var(--myio-green-tint)");
    expect(appTileColorVars(c)["--portal-bg"]).toBe("var(--myio-white)");
  });
  it("keeps saved brand choices for background, border and texts", () => {
    const c = parseAppTile('{"bg":"escuro","border":"roxo","inside":"branco","below":"branco"}');
    expect(appTileColorVars(c)).toEqual({ "--portal-bg": "var(--myio-dark)", "--tile-fill": "var(--myio-green)", "--tile-border": "var(--myio-purple)", "--tile-symbol": "var(--myio-dark)", "--tile-inside": "var(--myio-white)", "--tile-below": "var(--myio-white)" });
  });
  it("rejects colours outside the brand manual and falls back to the current look", () => {
    const c = parseAppTile('{"bg":"#ff0000","border":"rosa","inside":"amarelo","below":"azul"}');
    expect([c.bg, c.border, c.inside, c.below]).toEqual(["padrao", "padrao", "padrao", "padrao"]);
  });
  it("warns when the text below the tiles would disappear on the background", () => {
    expect(appTileLowContrast(parseAppTile('{"bg":"escuro","below":"escuro"}'))).toBe(true);
    expect(appTileLowContrast(parseAppTile('{"bg":"escuro","below":"branco"}'))).toBe(false);
  });
});
describe("app names and fonts", () => {
  it("identifica Finance sem mudar a chave financeira nem quebrar o nome antigo", () => {
    expect(appKeyForName("Finance")).toBe("cash_flow");
    expect(appKeyForName("Cash Flow")).toBe("cash_flow");
    expect(appDisplay(parseAppTile("{}"), "cash_flow").name).toBe("Finance");
  });
  it("reads an individual name, size and brand colour without changing the app key", () => {
    const config = parseAppTile('{"apps":{"crm":{"name":"Vendas","labelPx":20,"color":"roxo"}}}');
    expect(appDisplay(config, "crm", 16)).toEqual({ name: "Vendas", labelPx: 20, colorKey: "roxo", color: "var(--myio-purple)" });
    expect(appKeyForName("CRM")).toBe("crm");
  });
  it("keeps the global font and automatic colour when only the name is customized", () => {
    const config = parseAppTile('{"labelPx":13,"apps":{"supply":{"name":"Suprimentos"}}}');
    expect(appDisplay(config, "supply")).toEqual({ name: "Suprimentos", labelPx: 13, colorKey: "padrao" });
    expect(appDisplay(config, "supply", 16)).toEqual({ name: "Suprimentos", labelPx: 16, colorKey: "padrao" });
  });
  it("rejects invalid font sizes and colours and limits names to 30 characters", () => {
    const config = parseAppTile(JSON.stringify({ apps: { legal: { name: "Jurídico e contratos empresariais", labelPx: 99, color: "rosa" } } }));
    expect(config.apps?.legal?.name).toHaveLength(30);
    expect(config.apps?.legal?.labelPx).toBeUndefined();
    expect(config.apps?.legal?.color).toBeUndefined();
    expect(appDisplay(config, "legal", 16)).toEqual({ name: "Jurídico e contratos empresari", labelPx: 16, colorKey: "padrao" });
  });
});

describe("logo dos apps", () => {
  it("usa 40 px da Home por padrão e aceita 24–64 px", async () => {
    const { parseAppTile, appLogoPx } = await import("./app-order-config");
    expect(appLogoPx(parseAppTile("{}"))).toBe(40);
    expect(appLogoPx(parseAppTile('{"appLogoPx":32}'))).toBe(32);
    expect(appLogoPx(parseAppTile('{"appLogoPx":90}'))).toBe(40);
  });
});

describe("configuração de legendas por app", () => {
  it("preserva a legenda vazia e opções independentes do nome ao reler o padrão", () => {
    const config = parseAppTile(JSON.stringify({ below: "verde", apps: { indicadores: { description: "", descriptionPx: 12, descriptionColor: "escuro", labelPx: 20, color: "roxo" } } }));
    expect(config.apps?.indicadores?.description).toBe("");
    expect(config.apps?.indicadores?.descriptionPx).toBe(12);
    expect(config.apps?.indicadores?.descriptionColor).toBe("escuro");
    expect(config.apps?.indicadores?.labelPx).toBe(20);
    expect(config.below).toBe("verde");
  });
  it("não substitui configurações antigas nem aceita cores fora da marca", () => {
    const config = parseAppTile(JSON.stringify({ apps: { crm: { name: "Vendas", descriptionPx: 99, descriptionColor: "rosa" } } }));
    expect(config.apps?.crm?.description).toBeUndefined();
    expect(config.apps?.crm?.descriptionPx).toBeUndefined();
    expect(config.apps?.crm?.descriptionColor).toBeUndefined();
    expect(config.apps?.crm?.name).toBe("Vendas");
  });
});
