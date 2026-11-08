import { isFilterActive, type ColumnFilterValue } from "./column-filters";

/** Deleted tickets are opt-in through the status filter, never the daily queue. */
export function visibleCodeTickets<T extends { status: string }>(tickets: readonly T[], statusFilter?: ColumnFilterValue): T[] {
  return tickets.filter(ticket => ticket.status !== "excluido" || isFilterActive(statusFilter));
}