import { describe, expect, it, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import { appTileColorVars, appTileLowContrast, homeHeaderVars, homeHeaderLogoTone, mobileTileVars, parseAppTile } from "./app-order-config";

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
