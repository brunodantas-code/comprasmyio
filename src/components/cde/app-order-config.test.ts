import { describe, expect, it, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import { appTileColorVars, appTileLowContrast, parseAppTile } from "./app-order-config";

describe("app spacing configuration", () => {
  it("adds spacing to legacy choices without changing their selected tile appearance", () => {
    expect(parseAppTile('{"labelPx":13,"iconPct":100,"tilePct":100}')).toEqual({ labelPx: 13, iconPct: 100, tilePct: 100, gapX: 32, gapY: 40, bg: "padrao", fill: "padrao", border: "padrao", inside: "padrao", below: "padrao" });
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
});
describe("portal colours from the myio brand manual", () => {
  it("keeps saved brand choices for background, border and texts", () => {
    const c = parseAppTile('{"bg":"escuro","border":"roxo","inside":"branco","below":"branco"}');
    expect(appTileColorVars(c)).toEqual({ "--portal-bg": "var(--myio-dark)", "--tile-fill": "var(--myio-green)", "--tile-border": "var(--myio-purple)", "--tile-inside": "var(--myio-white)", "--tile-below": "var(--myio-white)" });
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
