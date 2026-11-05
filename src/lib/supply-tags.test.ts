import { describe, expect, it } from "vitest";
import { consolidateTagCosts, resolveSupplyTag } from "./supply-tags";

describe("supply tags", () => {
  it("só Interna aceita etiqueta", () => {
    expect(resolveSupplyTag("interna", "t1")).toBe("t1");
    expect(resolveSupplyTag("projeto", "t1")).toBeNull();
    expect(resolveSupplyTag("cliente", "t1")).toBeNull();
  });
  it("consolida por etiqueta ignorando canceladas", () => {
    const r = consolidateTagCosts([
      { tag_id: "a", status: "pendente", estimated_value: 100 },
      { tag_id: "a", status: "entregue", estimated_value: 50 },
      { tag_id: "a", status: "cancelado", estimated_value: 999 },
      { tag_id: null, status: "pendente", estimated_value: 10 },
    ]);
    expect(r.get("a")).toEqual({ count: 2, total: 150 });
    expect(r.size).toBe(1);
  });
});
