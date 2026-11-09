import { describe, expect, it, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import { parseAppTile } from "./app-order-config";

describe("app spacing configuration", () => {
  it("adds spacing to legacy choices without changing their selected tile appearance", () => {
    expect(parseAppTile('{"labelPx":13,"iconPct":100,"tilePct":100}')).toEqual({ labelPx: 13, iconPct: 100, tilePct: 100, gapX: 32, gapY: 40 });
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