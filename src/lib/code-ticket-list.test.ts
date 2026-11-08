import { describe, expect, it } from "vitest";
import { visibleCodeTickets } from "./code-ticket-list";
import { matchesColumnFilter } from "./column-filters";

const tickets = [{ id: "active", status: "aberto" }, { id: "done", status: "concluido" }, { id: "deleted", status: "excluido" }];
describe("Code default ticket queue", () => {
  it("hides Excluído without hiding concluded tickets", () => {
    expect(visibleCodeTickets(tickets).map(t => t.id)).toEqual(["active", "done"]);
  });
  it("keeps Excluído accessible with an explicit status selection", () => {
    const filter = { selected: ["Excluído"] };
    const filtered = tickets.filter(t => matchesColumnFilter("text", t.status === "excluido" ? "Excluído" : "Em aberto", t.status === "excluido" ? "Excluído" : "Em aberto", filter));
    expect(visibleCodeTickets(filtered, filter).map(t => t.id)).toEqual(["deleted"]);
  });
  it("hides deleted tickets again after clearing or leaving an empty condition", () => {
    expect(visibleCodeTickets(tickets, { op: "contains", value: "" }).map(t => t.id)).toEqual(["active", "done"]);
  });
});