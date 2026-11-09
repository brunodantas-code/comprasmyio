import { describe, expect, it } from "vitest";
import { usageTargets } from "./usage-links";

describe("CDE usage destinations", () => {
  it("opens access profiles under Supply administration", () => {
    expect(usageTargets("components/access-profiles-tab.tsx")[0]).toEqual({ to: "/dashboard", label: "Supply", search: { section: "admin", subsection: "acesso-restrito" } });
  });
  it("opens client categories under Diversos", () => {
    expect(usageTargets("components/client-categories-tab.tsx")[0]?.search).toEqual({ section: "projects", subsection: "diversos" });
  });
  it("links financial components to their own app", () => {
    expect(usageTargets("components/cash-flow/cash-register-tab.tsx")[0]?.to).toBe("/cash-flow");
  });
  it("does not invent a destination for an unknown file", () => {
    expect(usageTargets("components/unknown.tsx")).toEqual([]);
  });
});