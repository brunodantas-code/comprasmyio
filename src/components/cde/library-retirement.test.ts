import { describe, expect, it } from 'vitest';
import { canRetireLibraryEntry, readRetiredEntries } from './library-retirement';

const entry = { tag: 'Button', group: '', label: 'Salvar', file: 'components/example.tsx', line: 12, autoCdeSafe: true };
const selected = [{ group_key: 'save', variant_key: 'Button|outline|sm||Save|h-4 w-4', is_primary: true, screens: [] }];
describe('retirement requires applied standard', () => {
  it('accepts shared static buttons with a chosen standard', () => expect(canRetireLibraryEntry(entry, selected, [])).toBe(true));
  it('rejects buttons without a chosen standard', () => expect(canRetireLibraryEntry(entry, [], [])).toBe(false));
  it('rejects raw buttons even with a chosen standard', () => expect(canRetireLibraryEntry({ ...entry, tag: 'button' }, selected, [])).toBe(false));
  it('rejects dynamic or overridden buttons', () => expect(canRetireLibraryEntry({ ...entry, autoCdeSafe: false }, selected, [])).toBe(false));
  it('rejects unidentified controls', () => expect(canRetireLibraryEntry({ ...entry, label: '—' }, selected, [])).toBe(false));
  it('rejects missing custom models', () => expect(canRetireLibraryEntry(entry, [{ ...selected[0], variant_key: 'custom:missing' }], [])).toBe(false));
  it('supports explicit screen standards', () => expect(canRetireLibraryEntry({ ...entry, tag: 'CdeButton', group: 'plus' }, [{ group_key: 'plus', variant_key: 'Button|ghost|icon||Plus|h-4', is_primary: false, screens: [entry.file] }], [])).toBe(true));
  it('safely reads persisted retirement keys', () => expect(readRetiredEntries('["a",42]')).toEqual(['a']));
  it('accepts a live explicit text binding to a chosen group', () => expect(canRetireLibraryEntry({ ...entry, label: 'Abrir chamado' }, [...selected, { group_key: 'button_bindings', variant_key: '{"Abrir chamado":{"group":"save","label":"Chamado"}}', is_primary: true, screens: [] }], [])).toBe(true));
});