import { beforeEach, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ current: [{ label_id: "old" }], removed: [] as string[], inserted: [] as unknown[], user: "" }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: () => ({
  select: () => ({ eq: () => ({ eq: (_key: string, user: string) => { state.user = user; return Promise.resolve({ data: state.current, error: null }); } }) }),
  delete: () => ({ eq: () => ({ eq: () => ({ in: (_key: string, ids: string[]) => { state.removed = ids; return Promise.resolve({ error: null }); } }) }) }),
  insert: (rows: unknown[]) => { state.inserted = rows; return Promise.resolve({ error: null }); },
}) } }));
import { saveTodoLabels } from "./labels";
beforeEach(() => { state.current = [{ label_id: "old" }]; state.removed = []; state.inserted = []; });
it("links personal labels to the selected task and user", async () => {
  await saveTodoLabels("todo-1", "user-1", ["new"]);
  expect(state.user).toBe("user-1");
  expect(state.inserted).toEqual([{ todo_id: "todo-1", owner_id: "user-1", label_id: "new" }]);
  expect(state.removed).toEqual(["old"]);
});
it("preserves existing links without duplicating them", async () => {
  await saveTodoLabels("todo-1", "user-1", ["old"]);
  expect(state.removed).toEqual([]); expect(state.inserted).toEqual([]);
});