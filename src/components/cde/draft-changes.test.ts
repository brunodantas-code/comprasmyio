import { describe, expect, it } from "vitest";
import { cdeDraftChanged } from "./draft-changes";

describe("CDE save eligibility", () => {
  it("does not enable Save for an unchanged draft", () => {
    expect(cdeDraftChanged({ name: "Modelo", size: 14 }, { name: "Modelo", size: 14 })).toBe(false);
  });
  it("enables Save only after a value changes", () => {
    expect(cdeDraftChanged({ name: "Modelo", size: 16 }, { name: "Modelo", size: 14 })).toBe(true);
  });
  it("disables Save again when the original values are restored", () => {
    const initial = { screens: ["spend", "supply"] };
    expect(cdeDraftChanged({ screens: ["spend"] }, initial)).toBe(true);
    expect(cdeDraftChanged({ screens: ["spend", "supply"] }, initial)).toBe(false);
  });
});