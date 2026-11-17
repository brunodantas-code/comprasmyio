import { describe, expect, it } from "vitest";
import { fieldClassWithoutHeight } from "./select";

describe("select field height", () => {
  it("removes the CDE model height so the green line matches the input beside it", () => {
    expect(fieldClassWithoutHeight("h-10 rounded-none border-0 border-b border-myio-green sm:h-12")).toBe("rounded-none border-0 border-b border-myio-green");
  });
  it("keeps non-height classes such as min-h and hover", () => {
    expect(fieldClassWithoutHeight("min-h-8 hover:bg-muted px-0")).toBe("min-h-8 hover:bg-muted px-0");
  });
});
