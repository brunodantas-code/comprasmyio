import { describe, expect, it } from "vitest";
import { consolidateLibrary, libraryModelKey } from "./library-models";

const cancel = { id: "a", label: "Cancelar", icon: "", tag: "Button", variant: "outline", size: "", className: "", visualCustom: false, dynamic: false };
const key = (site: typeof cancel) => libraryModelKey(site, { group: "cancel", model: "primary" });
describe("consolidated library models", () => {
  it("collects identical Cancelar uses into one editable model without losing IDs", () => {
    const groups = consolidateLibrary([cancel, { ...cancel, id: "b" }], key);
    expect(groups).toHaveLength(1);
    expect(groups[0].uses.map(s => s.id)).toEqual(["a", "b"]);
  });
  it("retains differing backgrounds and unknown inline styles as separate models", () => {
    const groups = consolidateLibrary([cancel, { ...cancel, id: "b", className: "bg-primary" }, { ...cancel, id: "c", visualCustom: true }, { ...cancel, id: "d", visualCustom: true }], key);
    expect(groups).toHaveLength(4);
  });
  it("keeps different descriptive actions and secondary models distinct", () => {
    expect(consolidateLibrary([cancel, { ...cancel, id: "b", label: "Cancelar pedido" }], key)).toHaveLength(2);
    expect(libraryModelKey(cancel, { group: "cancel", model: "secondary" })).not.toBe(key(cancel));
  });
  it("consolidates replaced Cancelar appearances under their explicit common model", () => {
    const replacedKey = (site: typeof cancel) => libraryModelKey(site, { group: "cancel", model: "custom:chosen", bound: true });
    expect(consolidateLibrary([cancel, { ...cancel, id: "b", className: "bg-primary" }], replacedKey)).toHaveLength(1);
  });
});