import { expect, it } from "vitest";
import { boxTitleLimit, boxDescriptionLimit } from "./mytosis-title";

it("ajusta o limite de caracteres à largura do box", () => {
  expect(boxTitleLimit(240, 18)).toBe(20);
  expect(boxTitleLimit(480, 18)).toBe(42);
});
it("ajusta o limite à fonte e à área útil da forma", () => {
  expect(boxTitleLimit(240, 32)).toBe(11);
  expect(boxTitleLimit(240, 18, "decision")).toBe(10);
});
it("limita a descrição proporcionalmente à largura e fonte", () => {
  expect(boxDescriptionLimit(240, 96, 11, 18)).toBe(33);
  expect(boxDescriptionLimit(480, 96, 11, 18)).toBe(69);
  expect(boxDescriptionLimit(240, 96, 22, 18)).toBe(16);
});
it("recalcula a descrição conforme a altura e o espaço do título", () => {
  expect(boxDescriptionLimit(240, 160, 11, 18)).toBe(198);
  expect(boxDescriptionLimit(240, 160, 11, 32)).toBe(165);
});