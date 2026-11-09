import { describe, expect, it } from "vitest";
import { readButtonBindings, resolveButtonBinding } from "./library-bindings";
import { canRetireLibraryEntry } from "./library-retirement";
describe("specific library bindings", () => {
  it("isolates two destructive actions with the same name", () => {
    const binding = { group: 'trash', label: 'Excluir visita e manter chamados', modelKey: 'custom:one' };
    expect(resolveButtonBinding({ 'site-one': binding }, 'site-one', 'Excluir')).toEqual(binding);
    expect(resolveButtonBinding({ 'site-one': binding }, 'site-two', 'Excluir')).toBeUndefined();
  });
  it("supports icon-only alternatives", () => expect(readButtonBindings('{"site":{"group":"send","label":"","modelKey":"custom:one"}}').site.label).toBe(''));
  it("requires a real replacement before retiring native dynamic controls", () => {
    const entry = { id: 'native', tag: 'button', group: '', label: 'Excluir', file: 'components/example.tsx', line: 1 };
    const rows = [{ group_key: 'button_bindings', is_primary: true, screens: [], variant_key: '{"native":{"group":"trash","label":"","modelKey":"custom:one"}}' }];
    expect(canRetireLibraryEntry(entry, rows, [])).toBe(false);
    expect(canRetireLibraryEntry(entry, rows, [{ id: 'one' }])).toBe(true);
  });
});