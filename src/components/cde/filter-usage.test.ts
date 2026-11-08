import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import usage from "./filter-usage.json";

function scan(dir: string): typeof usage {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return scan(path);
    if (!entry.name.endsWith(".tsx") || ["use-table-filters.tsx", "column-filter.tsx", "site-survey-general-filter.tsx"].includes(entry.name)) return [];
    const source = readFileSync(path, "utf8");
    const standard = (source.match(/\buseTableFilters\s*\(/g) ?? []).length + (source.match(/<TableFilterMenu\b/g) ?? []).length + (source.match(/<ColumnFilter\b/g) ?? []).length;
    const general = (source.match(/<SiteSurveyGeneralFilter\b/g) ?? []).length;
    return standard || general ? [{ file: relative("src", path), standard, general }] : [];
  }).sort((a, b) => a.file.localeCompare(b.file));
}

describe("filter consumer ledger", () => {
  it("counts the actual consumer sites, not shared component definitions", () => {
    expect([...usage].sort((a, b) => a.file.localeCompare(b.file))).toEqual(scan("src"));
  });
});