import { expect, it } from "vitest";
import { splitCount } from "./mytosis-split";
it("aceita três etapas paralelas, sem arredondar quantidades", () => {
  expect(splitCount("3")).toBe(3);
  expect(() => splitCount("3.5")).toThrow();
  expect(() => splitCount("0")).toThrow();
});