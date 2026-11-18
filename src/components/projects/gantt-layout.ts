import { parseISO } from "date-fns";

/** Keep the monthly calendar at least as wide as its visible workspace. */
export function monthlyEndPadding(tasks: { start: string; end: string }[], width: number, columnWidth = 120) {
  const months = tasks.flatMap(task => [task.start, task.end]).map(value => {
    const date = parseISO(value);
    return date.getFullYear() * 12 + date.getMonth();
  }).filter(Number.isFinite);
  if (!months.length) return 2;
  const occupiedColumns = Math.max(...months) - Math.min(...months) + 3;
  return Math.max(2, Math.ceil(width / columnWidth) - occupiedColumns);
}