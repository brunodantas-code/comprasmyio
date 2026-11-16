import { describe, expect, it } from "vitest";
import { matchesCodeTicketSearch } from "./code-ticket-search";
import { matchesColumnFilter } from "./column-filters";

describe("Code search and combined filters", () => {
  it("finds a ticket by its title with the Atas contains condition", () => {
    expect(matchesCodeTicketSearch(["20", "Supply", "Passagem somente ida"], { op: "contains", value: "passagem" })).toBe(true);
    expect(matchesCodeTicketSearch(["21", "Code", "Ordenação"], { op: "contains", value: "passagem" })).toBe(false);
  });
  it("excludes tickets when any field contains the search term", () => {
    expect(matchesCodeTicketSearch(["Code", "Passagem"], { op: "not_contains", value: "passagem" })).toBe(false);
    expect(matchesCodeTicketSearch(["Code", "Ordenação"], { op: "not_contains", value: "passagem" })).toBe(true);
  });
  it("combines application and situation filters without losing either", () => {
    const rows = [{ app: "Supply", status: "Concluído" }, { app: "Supply", status: "Em aberto" }, { app: "Code", status: "Concluído" }];
    const result = rows.filter(row => matchesColumnFilter("text", row.app, row.app, { selected: ["Supply"] }) && matchesColumnFilter("text", row.status, row.status, { selected: ["Concluído"] }));
    expect(result).toEqual([{ app: "Supply", status: "Concluído" }]);
  });
});