import { expect, it } from "vitest";
import { approvalShortcut } from "./shortcut";
it("Enter aprova somente uma vez fora dos campos e diálogos", () => {
  expect(approvalShortcut("Enter", false, false, false, false)).toBe(true);
  expect(approvalShortcut("Escape", false, false, false, false)).toBe(false);
  expect(approvalShortcut("Enter", true, false, false, false)).toBe(false);
  expect(approvalShortcut("Enter", false, true, false, false)).toBe(false);
  expect(approvalShortcut("Enter", false, false, true, false)).toBe(false);
  expect(approvalShortcut("Enter", false, false, false, true)).toBe(false);
});