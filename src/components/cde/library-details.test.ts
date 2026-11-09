import { describe, expect, it } from "vitest";
import { libraryUsageCounts } from "./library-details";

describe("library usage counts", () => {
  it("counts one source use separately from the same function in other places", () => {
    const entries = [
      { id: "a", file: "one.tsx", label: "Salvar", dynamic: false, icon: "Save", group: "save" },
      { id: "b", file: "two.tsx", label: "Salvar", dynamic: false, icon: "Save", group: "save" },
      { id: "c", file: "three.tsx", label: "Salvar", dynamic: false, icon: "Save", group: "export" },
    ];
    expect(libraryUsageCounts(entries[0], entries, e => e.group)).toEqual({ here: 1, sameFunction: 2 });
    expect(libraryUsageCounts(entries[0], entries.slice(1), e => e.group)).toEqual({ here: 0, sameFunction: 1 });
  });
});