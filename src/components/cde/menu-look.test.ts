import { expect, it, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import { parseMenuLook } from "./menu-look";
it("Flexível é opcional e mantém a largura padrão salva", () => {
  expect(parseMenuLook('{}').flexible).toBe(false);
  const saved = parseMenuLook('{"flexible":true,"sideWidth":280}');
  expect(parseMenuLook(JSON.stringify(saved)).flexible).toBe(true);
  expect(saved.sideWidth).toBe(280);
});

it("preserva largura e altura salvas ao reabrir o editor", () => {
  const saved = parseMenuLook(JSON.stringify({ sideWidth: 280, buttonHeight: 48 }));
  expect(parseMenuLook(JSON.stringify(saved)).sideWidth).toBe(280);
  expect(parseMenuLook(JSON.stringify(saved)).buttonHeight).toBe(48);
});

it("preserva cores personalizadas quando as medidas mudam", () => {
  const original = parseMenuLook(JSON.stringify({ selected: "roxo", sideWidth: 240 }));
  const resized = parseMenuLook(JSON.stringify({ ...original, sideWidth: 280, buttonHeight: 48 }));
  expect(resized.selected).toBe(original.selected);
  expect(resized.sideWidth).toBe(280);
});