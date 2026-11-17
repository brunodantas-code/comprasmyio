import { describe, expect, it, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import { columnPermutation, parseTableColumnOrders } from "./table-column-order";

describe("ordem das colunas definida no CDE", () => {
  it("reordena os cabeçalhos conforme o arraste salvo", () => {
    expect(columnPermutation([0, 1, 2, 3], [2, 0, 1, 3])).toEqual([2, 0, 1, 3]);
  });
  it("mantém a ordem quando a coluna condicional não aparece", () => {
    // coluna 1 ausente: presentes 0,2,3 → ordem salva 3,1,0,2
    expect(columnPermutation([0, 2, 3], [3, 1, 0, 2])).toEqual([2, 0, 1]);
  });
  it("sem ordem salva, a lista fica como no app", () => {
    expect(columnPermutation([0, 1, 2], undefined)).toBeNull();
    expect(columnPermutation([0, 1, 2], [0, 1, 2])).toBeNull();
  });
  it("ignora valores inválidos salvos", () => {
    expect(parseTableColumnOrders('{"a|0":[1,0],"b|0":["x"]}')).toEqual({ "a|0": [1, 0] });
  });
});
