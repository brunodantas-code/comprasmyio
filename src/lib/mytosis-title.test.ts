import { expect, it } from "vitest";
import { boxTitleLimit } from "./mytosis-title";

it("ajusta o limite de caracteres à largura do box", () => {
  expect(boxTitleLimit(240, 18)).toBe(20);
  expect(boxTitleLimit(480, 18)).toBe(42);
});
it("ajusta o limite à fonte e à área útil da forma", () => {
  expect(boxTitleLimit(240, 32)).toBe(11);
  expect(boxTitleLimit(240, 18, "decision")).toBe(10);
});