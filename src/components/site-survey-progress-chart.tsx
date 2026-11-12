import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, LabelList, Tooltip, XAxis, YAxis } from "recharts";
import { ChartContainer } from "@/components/ui/chart";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { showsSurveyProgressDay, surveyProgressTechnicianId, surveyVisitTotals } from "@/lib/site-survey-progress";
import { Button } from "@/components/ui/button";
import { CdeDisclosureIcon } from "@/components/cde/cde-button";

type FinishedPoint = { id: string; completion_status: string; completed_at: string | null; completed_by: string | null };
type Technician = { id: string; full_name: string; email: string | null };

const timeZone = "America/Sao_Paulo";
const dateParts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23" });

function completionSlot(iso: string) {
  const parts = Object.fromEntries(dateParts.formatToParts(new Date(iso)).map(({ type, value }) => [type, value]));
  return { day: `${parts.year}-${parts.month}-${parts.day}`, hour: Number(parts.hour) };
}

export function SiteSurveyProgressChart({ points, technicians, visitNumber, responsibleTechnicianId }: { points: FinishedPoint[]; technicians: Technician[]; visitNumber: number; responsibleTechnicianId: string | null }) {
  const [open, setOpen] = useState(false);
  const [consolidated, setConsolidated] = useState(true);
  const [technicianId, setTechnicianId] = useState("");
  const totals = surveyVisitTotals(points);
  const completed = useMemo(() => points.filter((point) => point.completion_status === "concluida" && point.completed_at && !Number.isNaN(Date.parse(point.completed_at))).map((point) => ({ ...point, completed_by: surveyProgressTechnicianId(responsibleTechnicianId, point.completed_by) })), [points, responsibleTechnicianId]);
  const finishers = useMemo(() => [...new Set(completed.map((point) => point.completed_by).filter((id): id is string => Boolean(id)))].map((id) => ({ id, name: technicians.find((person) => person.id === id)?.full_name || technicians.find((person) => person.id === id)?.email || "Técnico não identificado" })).sort((a, b) => a.name.localeCompare(b.name, "pt-BR")), [completed, technicians]);
  const selectedId = finishers.some((person) => person.id === technicianId) ? technicianId : finishers[0]?.id ?? "";
  const days = useMemo(() => {
    const visible = consolidated ? completed : completed.filter((point) => point.completed_by === selectedId);
    if (!visible.length) return [];
    const slots = visible.map((point) => completionSlot(point.completed_at ?? ""));
    const dates = slots.map((slot) => slot.day).sort();
    const first = dates[0];
    const last = dates.at(-1);
    if (!first || !last) return [];
    const bySlot = new Map<string, number>();
    slots.forEach(({ day, hour }) => bySlot.set(`${day}:${hour}`, (bySlot.get(`${day}:${hour}`) ?? 0) + 1));
    const result: { day: string; label: string; total: number; hours: { hour: string; visits: number }[] }[] = [];
    const cursor = new Date(`${first}T12:00:00Z`);
    const end = new Date(`${last}T12:00:00Z`);
    while (cursor <= end) {
      const day = cursor.toISOString().slice(0, 10);
      const hours = Array.from({ length: 24 }, (_, hour) => ({ hour: `${String(hour).padStart(2, "0")}h`, visits: bySlot.get(`${day}:${hour}`) ?? 0 }));
      result.push({ day, label: `${day.slice(8, 10)}/${day.slice(5, 7)}/${day.slice(0, 4)}`, total: hours.reduce((sum, item) => sum + item.visits, 0), hours });
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    return result.filter((day) => showsSurveyProgressDay(visitNumber, day.day));
  }, [completed, consolidated, selectedId, visitNumber]);

  return <section className="min-w-0 max-w-full space-y-4" aria-label="Avanço das visitas">
    <div className="flex items-center justify-between gap-3">
      <h3 className="font-bold">Avanço das visitas</h3>
      <Button type="button" variant="ghost" size="compactIcon" aria-label={open ? "Recolher gráficos de visitas" : "Exibir gráficos de visitas"} title={open ? "Recolher gráficos" : "Exibir gráficos"} aria-expanded={open} aria-controls={`survey-progress-${visitNumber}`} onClick={() => setOpen((current) => !current)}><CdeDisclosureIcon open={open} direction="vertical" screen="components/site-survey-progress-chart.tsx" /></Button>
    </div>
    <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm text-muted-foreground" aria-label="Total de visitas"><span>Realizadas: <strong className="font-semibold text-foreground">{totals.completed}</strong></span><span>A realizar: <strong className="font-semibold text-foreground">{totals.remaining}</strong></span></div>
    {open ? <div id={`survey-progress-${visitNumber}`} className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2"><Checkbox id="survey-progress-consolidated" checked={consolidated} onCheckedChange={(checked) => setConsolidated(checked === true)} /><Label htmlFor="survey-progress-consolidated">Consolidado</Label></div>
        <Select value={selectedId} onValueChange={setTechnicianId} disabled={consolidated || !finishers.length}><SelectTrigger aria-label="Técnico" className="w-48 max-w-full"><SelectValue placeholder="Selecione o técnico" /></SelectTrigger><SelectContent>{finishers.map((person) => <SelectItem key={person.id} value={person.id}>{person.name}</SelectItem>)}</SelectContent></Select>
      </div>
    {!completed.length ? <p className="text-sm text-muted-foreground">Ainda não há visitas concluídas para exibir.</p> : !days.length ? <p className="text-sm text-muted-foreground">Nenhuma visita concluída para este técnico.</p> : <div className="space-y-5">{days.map((day) => <div key={day.day} className="min-w-0 space-y-1"><div className="flex items-center justify-between text-sm"><span className="font-semibold">{day.label}</span><span className="text-muted-foreground">{day.total} {day.total === 1 ? "visita" : "visitas"}</span></div><div className="w-full overflow-x-auto"><ChartContainer config={{ visits: { label: "Visitas", color: "var(--primary)" } }} className="h-44 min-w-0 w-full aspect-auto"><BarChart data={day.hours} margin={{ top: 20, right: 12, bottom: 4, left: 0 }} barCategoryGap="12%"><CartesianGrid vertical={false} stroke="var(--border)" /><XAxis dataKey="hour" tick={{ fontSize: 10 }} interval="preserveStartEnd" minTickGap={12} axisLine={false} tickLine={false} /><YAxis allowDecimals={false} width={64} tickMargin={8} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} label={{ value: "Qtd. de visitas", angle: -90, position: "insideLeft", style: { fill: "var(--muted-foreground)", fontSize: 10, textAnchor: "middle" }, offset: 12 }} /><Tooltip formatter={(value: number) => [value, "Visitas"]} labelFormatter={(hour) => `${day.label} às ${hour}`} /><Bar dataKey="visits" fill="var(--primary)" radius={[2, 2, 0, 0]} maxBarSize={24}><LabelList dataKey="visits" position="top" offset={6} fill="var(--muted-foreground)" fontSize={11} fontWeight={400} formatter={(value: unknown) => Number(value) > 0 ? String(value) : ""} /></Bar></BarChart></ChartContainer></div></div>)}</div>}
    </div> : null}
  </section>;
}