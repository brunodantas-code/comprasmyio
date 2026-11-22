import { expect, it } from "vitest";
import { resolveMenus } from "./menu-layout";
it("preserva o menu flutuante atualmente usado na base", () => {
  expect(resolveMenus({}, "Supply")).toEqual({ mobile: "floating", desktop: "floating" });
  expect(resolveMenus({ Supply: "bottom" }, "Supply")).toEqual({ mobile: "floating", desktop: "floating" });
});
it("separa escolhas Mobile e Desktop", () => {
  expect(resolveMenus({ Supply: { mobile: "floating", desktop: "left" } }, "Supply")).toEqual({ mobile: "floating", desktop: "left" });
  expect(resolveMenus({ Supply: { mobile: "bottom", desktop: "right" } }, "Supply")).toEqual({ mobile: "bottom", desktop: "right" });
});
it("padrão global e exceções por app preservam Finance", () => {
  const config = { "*": { mobile: "bottom", desktop: "left" }, "Cash Flow": { desktop: "right" } };
  expect(resolveMenus(config, "Finance")).toEqual({ mobile: "bottom", desktop: "right" });
  expect(resolveMenus(config, "Indicadores")).toEqual({ mobile: "bottom", desktop: "left" });
});