import { describe, expect, it } from "vitest";
import { standardsFirst } from "./model-order";
describe("selected standard first", () => {
  it("reorders immediately when the selected model changes", () => {
    expect(standardsFirst(['floating', 'popover', 'tabs'], item => item === 'popover')).toEqual(['popover', 'floating', 'tabs']);
    expect(standardsFirst(['floating', 'popover', 'tabs'], item => item === 'tabs')).toEqual(['tabs', 'floating', 'popover']);
  });
});