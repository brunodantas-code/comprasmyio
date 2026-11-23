import { expect, it } from "vitest";
import { readTextCaseChoice, writeTextCaseChoice } from "./use-text-case-choice";

it("guarda e restaura Aa ligado e desligado sem misturar telas", () => {
  const values = new Map<string, string>();
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
  writeTextCaseChoice(storage, "spend:holder", true);
  expect(readTextCaseChoice(storage, "spend:holder")).toBe(true);
  expect(readTextCaseChoice(storage, "survey:visit")).toBe(false);
  writeTextCaseChoice(storage, "spend:holder", false);
  expect(readTextCaseChoice(storage, "spend:holder")).toBe(false);
});