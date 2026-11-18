import { Graph, alg } from "@dagrejs/graphlib";
import { addDays, format, parseISO } from "date-fns";

export type Calendar = { calendar_mode: string; holidays: string[]; hours_per_day: number; start_date: string };
export type PlanTask = { id: string; name: string; start_date: string; duration: number; milestone: boolean; progress: number; actual_start: string | null; actual_end: string | null; responsible_id: string | null; phase_id: string | null; position: number; notes: string; project_id: string; parent_id?: string | null; work_package?: boolean };
export type Dependency = { predecessor_id: string; successor_id: string; lag: number; link_type?: string };
export type ScheduledTask = PlanTask & { start: string; end: string; critical: boolean; float: number };
export const dateKey = (date: Date) => format(date, "yyyy-MM-dd");
export function isWorking(date: string, calendar: Calendar) {
  if (calendar.calendar_mode === "calendar") return true;
  const day = parseISO(date).getDay();
  return day !== 0 && day !== 6 && !calendar.holidays.includes(date);
}
export function nextWorking(date: string, calendar: Calendar) {
  let current = date;
  while (!isWorking(current, calendar)) current = dateKey(addDays(parseISO(current), 1));
  return current;
}
export function advance(date: string, count: number, calendar: Calendar) {
  let current = nextWorking(date, calendar);
  for (let i = 0; i < Math.abs(count); i++) {
    do { current = dateKey(addDays(parseISO(current), count < 0 ? -1 : 1)); } while (!isWorking(current,calendar));
  }
  return current;
}
export function dependencyOffset(previous: PlanTask, next: PlanTask, dep: Dependency) {
  const p = Math.max(0,previous.duration-1), n = Math.max(0,next.duration-1);
  switch(dep.link_type??"TI") {
    case "II": return dep.lag;
    case "TT": return p-n+dep.lag;
    case "IT": return -n+dep.lag;
    default: return p+(previous.milestone?0:1)+dep.lag;
  }
}
export function schedule(tasks: PlanTask[], deps: Dependency[], calendar: Calendar): ScheduledTask[] {
  const graph = new Graph({ directed: true });
  const byId = new Map(tasks.map(task => [task.id, task]));
  tasks.forEach(task => graph.setNode(task.id));
  deps.forEach(dep => { if (!byId.has(dep.predecessor_id) || !byId.has(dep.successor_id)) throw new Error("Dependência sem tarefa correspondente"); graph.setEdge(dep.predecessor_id, dep.successor_id); });
  if (!alg.isAcyclic(graph)) throw new Error("Dependência circular: revise as predecessoras.");
  const result = new Map<string, ScheduledTask>();
  const order = alg.topsort(graph);
  for (const id of order) {
    const task = byId.get(id);
    if (!task) continue;
    let start = nextWorking(task.start_date > calendar.start_date ? task.start_date : calendar.start_date, calendar);
    for (const dep of deps.filter(dep => dep.successor_id === id)) {
      const previous = result.get(dep.predecessor_id);
      if (previous) {
        const candidate = advance(previous.start, dependencyOffset(previous,task,dep), calendar);
        if (candidate > start) start = candidate;
      }
    }
    result.set(id, { ...task, start, end: advance(start, Math.max(0, task.duration - 1), calendar), critical: false, float: 0 });
  }
  const totalEnd = [...result.values()].reduce((end, task) => task.end > end ? task.end : end, calendar.start_date);
  const latest = new Map<string, string>();
  const retreat = (date: string, count: number) => { let current = date; for (let i = 0; i < count; i++) { do { current = dateKey(addDays(parseISO(current), -1)); } while (!isWorking(current, calendar)); } return current; };
  for (const id of [...order].reverse()) {
    const task = result.get(id);
    if (!task) continue;
    let end = totalEnd;
    for (const dep of deps.filter(dep => dep.predecessor_id === id)) {
      const following = latest.get(dep.successor_id);
      if (following) { const nextTask = result.get(dep.successor_id); if (!nextTask) continue; const candidate = advance(following, -dependencyOffset(task,nextTask,dep) + Math.max(0,task.duration-1), calendar); if (candidate < end) end = candidate; }
    }
    const lastStart = retreat(end, Math.max(0, task.duration - 1));
    latest.set(id, lastStart);
    let slack = 0; let current = task.start;
    while (current < lastStart && slack < 20000) { current = advance(current, 1, calendar); slack++; }
    task.float = slack; task.critical = slack === 0;
  }
  return tasks.map(task => result.get(task.id)).filter((task): task is ScheduledTask => Boolean(task));
}
export type Allocation = { task_id: string; resource_id: string; planned_quantity: number; actual_quantity: number; unit_rate: number };
export function totals(allocations: Allocation[]) { return allocations.reduce((sum, item) => ({ planned: sum.planned + item.planned_quantity * item.unit_rate, actual: sum.actual + item.actual_quantity * item.unit_rate }), { planned: 0, actual: 0 }); }
export function overloads(tasks: ScheduledTask[], allocations: Allocation[], resources: { id: string; user_id: string | null; name: string; kind: string; capacity_per_day: number }[], calendars: Map<string, Calendar>) {
  const loads = new Map<string, { name: string; date: string; load: number; capacity: number }>();
  for (const allocation of allocations) {
    const task = tasks.find(task => task.id === allocation.task_id); const resource = resources.find(resource => resource.id === allocation.resource_id);
    const calendar = task ? calendars.get(task.project_id) : undefined;
    if (!task || !resource || resource.kind !== "person" || !calendar || task.milestone || task.progress === 100) continue;
    const perDay = allocation.planned_quantity / Math.max(1, task.duration);
    for (let date = task.start; date <= task.end; date = dateKey(addDays(parseISO(date), 1))) {
      if (!isWorking(date, calendar)) continue;
      const key = `${resource.user_id ?? resource.id}:${date}`; const current = loads.get(key);
      loads.set(key, { name: resource.name, date, load: (current?.load ?? 0) + perDay, capacity: Math.min(current?.capacity ?? resource.capacity_per_day, resource.capacity_per_day) });
    }
  }
  return [...loads.values()].filter(row => row.load > row.capacity).sort((a,b) => a.date.localeCompare(b.date));
}
export function progress(tasks: PlanTask[]) { const weight = tasks.reduce((sum, task) => sum + Math.max(1, task.duration), 0); return weight ? Math.round(tasks.reduce((sum, task) => sum + task.progress * Math.max(1, task.duration), 0) / weight) : 0; }
export const money = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const displayDate = (value?: string | null) => value ? format(parseISO(value), "dd/MM/yyyy") : "—";