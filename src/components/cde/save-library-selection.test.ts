import { describe, expect, it, vi } from "vitest";

const transport = vi.hoisted(() => {
  const state = { payload: {} as Record<string, unknown>, filters: [] as [string, unknown][] };
  const single = vi.fn(async () => ({ data: { group_key: "button_bindings" }, error: null }));
  const query = {
    eq: vi.fn((key: string, value: unknown) => { state.filters.push([key, value]); return query; }),
    select: vi.fn(() => ({ single })),
  };
  return { state, single, query, update: vi.fn((payload: Record<string, unknown>) => { state.payload = payload; state.filters = []; return query; }), insert: vi.fn(() => query) };
});
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: () => transport } }));
import { saveLibrarySelection } from "./save-library-selection";

describe("library selection persistence", () => {
  it("saves all 822 bindings in the body with constant-size filters", async () => {
    const bindings = JSON.stringify(Object.fromEntries(Array.from({ length: 822 }, (_, i) => [`site-${i}`, { group: "trash", label: "", preserveContent: false }])));
    await saveLibrarySelection("button_bindings", bindings, "user", true);
    expect(transport.state.payload.variant_key).toBe(bindings);
    expect(Object.keys(JSON.parse(String(transport.state.payload.variant_key)))).toHaveLength(822);
    expect(transport.state.filters).toEqual([["group_key", "button_bindings"], ["is_primary", true]]);
  });
  it("uses the same bounded filters when consolidating retired cards", async () => {
    await saveLibrarySelection("button_library_retired", "[]", "user", true);
    expect(transport.state.filters).toEqual([["group_key", "button_library_retired"], ["is_primary", true]]);
  });
  it("does not report success when no record was updated", async () => {
    transport.single.mockResolvedValueOnce({ data: null as never, error: { message: "Nenhum registro atualizado" } as never });
    await expect(saveLibrarySelection("button_bindings", "{}", "user", true)).rejects.toEqual({ message: "Nenhum registro atualizado" });
  });
});