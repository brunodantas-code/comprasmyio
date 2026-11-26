import { describe, expect, it } from "vitest";
import { sequentialNumberIsPlain } from "./number-display";

describe("sequential number framing", () => {
  it("keeps the full 6.1 sequence framed because it has two digits", () => {
    expect(sequentialNumberIsPlain("6.1")).toBe(false);
    expect(sequentialNumberIsPlain(6)).toBe(false);
    expect(sequentialNumberIsPlain(99)).toBe(false);
  });
  it("removes the circle above two digits without shortening the sequence", () => {
    expect(sequentialNumberIsPlain("6.10")).toBe(true);
    expect(sequentialNumberIsPlain("6.1.1")).toBe(true);
    expect(sequentialNumberIsPlain(100)).toBe(true);
  });
});