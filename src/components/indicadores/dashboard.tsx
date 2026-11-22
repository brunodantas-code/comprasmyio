import { useMemo, useState } from "react";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import {
  Archive,
  BarChart3,
  CalendarDays,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  Gauge,
  GitBranch,
  History,
  LayoutGrid,
  List,
  LockKeyhole,
  Pencil,
  Target,
  Trash2,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { confirmAction } from "@/components/confirm-dialog";
import { AppHeader } from "@/components/app-header";
import { MyioAppLogo } from "@/components/myio-app-logo";
import { AppNavigation } from "@/components/ui/app-navigation";
import { useAppMenuLayout } from "@/components/cde/cde-menu-type";
import { useMenuOrders, sortByMenuOrder } from "@/components/cde/menu-order";
import { CdeButton, CdeNumber } from "@/components/cde/cde-button";
import { useTableFilters } from "@/components/use-table-filters";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  CONFIDENCES,
  checkinDue,
  metricProgress,
  metricValue,
  objectiveProgress,
} from "@/lib/indicadores";
import { indicadoresOptions, type Metric, type Objective } from "./data";
import { Choice, IndicadorEditor, type EditSelection } from "./editors";
const screen = "components/indicadores/dashboard.tsx";
const confidenceName = (s: string) => CONFIDENCES.find((c) => c.value === s)?.label ?? s;
function Advance({ value }: { value: number }) {
  return (
    <div className="space-y-1">
      <p className="text-right text-sm tabular-nums">{value.toLocaleString("pt-BR")}%</p>
      <Progress value={value} className="h-1.5 bg-muted" aria-label="Avanço" />
    </div>
  );
}
export function IndicadoresDashboard() {
  const { data } = useSuspenseQuery(indicadoresOptions);
  const ml = useAppMenuLayout("Indicadores");
  const { data: menuOrders } = useMenuOrders();
  const [tab, setTab] = useState("okrs");
  const [view, setView] = useState("cards");
  const [mine, setMine] = useState(false);
  const [cycleId, setCycleId] = useState("active");
  const [edit, setEdit] = useState<EditSelection | null>(null);
  const [history, setHistory] = useState<Metric | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const canEdit = data.role === "admin" || data.role === "editor";
  const qc = useQueryClient();
  const userName = (id: string | null) =>
    data.users.find((u) => u.id === id)?.full_name ?? "Sem responsável";
  const isArchived = (o: Objective) =>
    data.cycles.find((c) => c.id === o.cycle_id)?.archived ?? false;
  const objectiveVisible = (o: Objective) =>
    cycleId === "all"
      ? true
      : cycleId === "archived"
        ? isArchived(o)
        : cycleId === "active"
          ? !isArchived(o)
          : o.cycle_id === cycleId;
  const availableObjectives = data.objectives.filter(objectiveVisible);
  const filters = useTableFilters(
    data.metrics.filter(
      (m) =>
        (tab === "checkins" || m.kind === (tab === "kpis" ? "kpi" : "kr")) &&
        (m.objective_id === null || availableObjectives.some((o) => o.id === m.objective_id)) &&
        (!(mine || tab === "checkins") || m.responsible_id === data.userId),
    ),
    [
      { key: "responsible", label: "Responsável", value: (m) => userName(m.responsible_id) },
      { key: "type", label: "Tipo", value: (m) => (m.kind === "kpi" ? "KPI" : "KR") },
      { key: "confidence", label: "Criticidade", value: (m) => confidenceName(m.confidence) },
      { key: "title", label: "Nome", value: (m) => m.title },
      {
        key: "progress",
        label: "Avanço",
        kind: "number",
        value: (m) => metricProgress(m.initial_value, m.target_value, m.current_value),
      },
    ],
  );
  const metrics = filters.filtered;
  const matching = new Set(metrics.map((m) => m.objective_id));
  const objectiveHasMatch = (id: string, seen = new Set<string>()): boolean => {
    if (seen.has(id)) return false;
    seen.add(id);
    return (
      matching.has(id) ||
      data.objectives.some((o) => o.parent_id === id && objectiveHasMatch(o.id, seen))
    );
  };
  const objectives = availableObjectives.filter(
    (o) =>
      !(mine || filters.active) ||
      objectiveHasMatch(o.id) ||
      (!mine && o.responsible_id === data.userId && !filters.active),
  );
  const progress = useMemo(
    () =>
      new Map(
        data.objectives.map((o) => [o.id, objectiveProgress(o.id, data.objectives, data.metrics)]),
      ),
    [data.objectives, data.metrics],
  );
  const chartData = data.users
    .map((u) => ({
      name: u.full_name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .slice(0, 3),
      fullName: u.full_name,
      value: Math.round(
        metrics
          .filter((m) => m.responsible_id === u.id)
          .reduce(
            (s, m) => s + metricProgress(m.initial_value, m.target_value, m.current_value),
            0,
          ) / (metrics.filter((m) => m.responsible_id === u.id).length || 1),
      ),
      count: metrics.filter((m) => m.responsible_id === u.id).length,
    }))
    .filter((u) => u.count);
  const mutation = useMutation({
    mutationFn: async (action: {
      type: "metric" | "objective" | "archive";
      id: string;
      archived?: boolean;
    }) => {
      const r =
        action.type === "archive"
          ? await supabase
              .from("indicadores_cycles")
              .update({ archived: action.archived ?? true })
              .eq("id", action.id)
              .select("id")
              .single()
          : action.type === "metric"
            ? await supabase
                .from("indicadores_metrics")
                .delete()
                .eq("id", action.id)
                .select("id")
                .single()
            : await supabase
                .from("indicadores_objectives")
                .delete()
                .eq("id", action.id)
                .select("id")
                .single();
      if (r.error) throw r.error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["indicadores"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const iconButton = (label: string, Icon: typeof Pencil, action: () => void) => (
    <Button variant="ghost" size="compactIcon" aria-label={label} title={label} onClick={action}>
      <Icon className="size-4" />
    </Button>
  );
  const latest = (id: string) => data.checkins.find((c) => c.metric_id === id);
  function metricCard(m: Metric) {
    const pct = metricProgress(m.initial_value, m.target_value, m.current_value);
    const ownerObjective = data.objectives.find((o) => o.id === m.objective_id);
    const archived = ownerObjective ? isArchived(ownerObjective) : false;
    return (
      <Card key={m.id} className="min-w-0">
        <CardHeader className="gap-2">
          <div className="flex items-start gap-2">
            <CardTitle className="min-w-0 flex-1 break-words font-normal leading-snug">
              {m.title}
            </CardTitle>
            {canEdit &&
              !archived &&
              iconButton(`Editar ${m.title}`, Pencil, () =>
                setEdit({ type: "metric", row: m, kind: m.kind === "kr" ? "kr" : "kpi" }),
              )}
            {canEdit &&
              iconButton(`Excluir ${m.title}`, Trash2, async () => {
                if (await confirmAction(`Excluir o indicador “${m.title}”?`))
                  mutation.mutate({ type: "metric", id: m.id });
              })}
          </div>
          <CardDescription>{userName(m.responsible_id)}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Badge>{confidenceName(m.confidence)}</Badge>
            <span className="text-sm">{m.kind === "kpi" ? "KPI" : "Key Result"}</span>
          </div>
          <div className="flex flex-wrap justify-between gap-2 text-sm">
            <span>{metricValue(m.current_value, m.measure, m.unit)}</span>
            <span className="text-muted-foreground">
              Meta: {metricValue(m.target_value, m.measure, m.unit)}
            </span>
          </div>
          <Advance value={pct} />
          {m.due_on && (
            <p className="text-sm text-muted-foreground">
              Prazo: {new Date(`${m.due_on}T12:00:00`).toLocaleDateString("pt-BR")}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            {!archived && (m.responsible_id === data.userId || data.role === "admin") && (
              <Button variant="outline" onClick={() => setEdit({ type: "checkin", row: m })}>
                <CheckCheck className="size-4" />
                Check-in
              </Button>
            )}
            {iconButton(`Histórico de ${m.title}`, History, () => setHistory(m))}
            {m.kind === "kpi" && canEdit && (
              <Button variant="ghost" onClick={() => setEdit({ type: "convert", row: m })}>
                <Target className="size-4" />
                Criar OKR
              </Button>
            )}
          </div>
          {checkinDue(latest(m.id)?.recorded_at, new Date()) && !archived && (
            <p className="text-xs text-destructive">Check-in semanal pendente</p>
          )}
        </CardContent>
      </Card>
    );
  }
  function objectiveCard(o: Objective, index: number) {
    const open = expanded.has(o.id);
    return (
      <div key={o.id} className="min-w-0 space-y-3">
        <Card>
          <CardHeader>
            <div className="flex items-start gap-2">
              <CdeNumber screen={screen}>{index + 1}</CdeNumber>
              <CardTitle className="min-w-0 flex-1 break-words font-normal leading-snug">
                {o.title}
              </CardTitle>
              {o.confidential && (
                <LockKeyhole aria-label="Confidencial" className="size-4 shrink-0" />
              )}
              {canEdit &&
                !isArchived(o) &&
                iconButton(`Editar ${o.title}`, Pencil, () =>
                  setEdit({ type: "objective", row: o }),
                )}
              {canEdit &&
                iconButton(`Excluir ${o.title}`, Trash2, async () => {
                  if (
                    await confirmAction(
                      `Excluir o objetivo “${o.title}”? Objetivos com resultados ou desdobramentos precisam ser reorganizados antes.`,
                    )
                  )
                    mutation.mutate({ type: "objective", id: o.id });
                })}
            </div>
            <CardDescription>
              {userName(o.responsible_id)} ·{" "}
              {o.alignment_name ??
                {
                  empresa: "Empresa",
                  departamento: "Departamento",
                  equipe: "Equipe",
                  individual: "Individual",
                }[o.scope] ??
                o.scope}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {o.parent_id && (
              <p className="text-sm text-muted-foreground">
                Alinhado a: {data.objectives.find((p) => p.id === o.parent_id)?.title}
              </p>
            )}
            <Advance value={progress.get(o.id) ?? 0} />
            <div className="flex items-center gap-2">
              {canEdit && !isArchived(o) && (
                <>
                  <CdeButton
                    group="plus"
                    screen={screen}
                    aria-label={`Novo KR em ${o.title}`}
                    title="Novo Key Result"
                    onClick={() => setEdit({ type: "metric", kind: "kr", objective: o })}
                  />
                  {iconButton(`Desdobrar ${o.title}`, GitBranch, () =>
                    setEdit({ type: "objective", parent: o }),
                  )}
                </>
              )}
              <span className="flex-1 text-sm text-muted-foreground">
                {data.cycles.find((c) => c.id === o.cycle_id)?.name ?? "Sem ciclo"}
              </span>
              {iconButton(
                `${open ? "Recolher" : "Exibir"} ${o.title}`,
                open ? ChevronDown : ChevronRight,
                () =>
                  setExpanded((current) => {
                    const n = new Set(current);
                    if (n.has(o.id)) n.delete(o.id);
                    else n.add(o.id);
                    return n;
                  }),
              )}
            </div>
          </CardContent>
        </Card>
        {open && (
          <div className="space-y-3">
            {o.description && <p className="whitespace-pre-wrap text-sm">{o.description}</p>}
            <div className="grid gap-3">
              {metrics.filter((m) => m.objective_id === o.id).map(metricCard)}
            </div>
            {!metrics.some((m) => m.objective_id === o.id) && (
              <p className="text-sm text-muted-foreground">Nenhum Key Result neste objetivo.</p>
            )}
          </div>
        )}
      </div>
    );
  }
  function tree(parent: string | null, depth = 0, seen = new Set<string>()): React.ReactNode {
    return objectives
      .filter((o) => o.parent_id === parent)
      .map((o, index) => {
        if (seen.has(o.id)) return null;
        const next = new Set(seen).add(o.id);
        return (
          <div key={o.id} className="space-y-3">
            <div className={depth ? "ml-4 sm:ml-8" : " "}>
              {objectiveCard(o, index)}
              <div className="mt-3 space-y-3">{tree(o.id, depth + 1, next)}</div>
            </div>
          </div>
        );
      });
  }
  const tabs = sortByMenuOrder(
    [
      { value: "okrs", label: "OKRs", icon: Target },
      { value: "kpis", label: "KPIs", icon: Gauge },
      { value: "checkins", label: "Check-ins", icon: CheckCheck },
      { value: "cycles", label: "Ciclos", icon: CalendarDays },
    ],
    menuOrders?.["Indicadores|Barra inferior"],
  );
  return (
    <div className="min-h-screen bg-background">
      <AppHeader logo={<MyioAppLogo appName="Indicadores" />} />
      <main className={`mx-auto max-w-[1500px] space-y-5 px-4 pb-28 pt-6 sm:px-6 ${ml.main}`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-normal">
            {tab === "okrs"
              ? "Objetivos e Key Results"
              : tab === "kpis"
                ? "Indicadores de desempenho"
                : tab === "checkins"
                  ? "Check-ins semanais"
                  : "Ciclos e períodos"}
          </h1>
          <div className="flex items-center gap-2">
            {tab !== "cycles" && filters.menu}
            {canEdit && tab !== "checkins" && (
              <CdeButton
                group="plus"
                screen={screen}
                aria-label={
                  tab === "cycles" ? "Novo ciclo" : tab === "kpis" ? "Novo KPI" : "Novo objetivo"
                }
                title={
                  tab === "cycles" ? "Novo ciclo" : tab === "kpis" ? "Novo KPI" : "Novo objetivo"
                }
                onClick={() =>
                  setEdit(
                    tab === "cycles"
                      ? { type: "cycle" }
                      : tab === "kpis"
                        ? { type: "metric", kind: "kpi" }
                        : { type: "objective" },
                  )
                }
              />
            )}
          </div>
        </div>
        {tab !== "cycles" && (
          <>
            <div className="flex flex-wrap items-end gap-3">
              <div className="w-44">
                <Choice
                  label="Visibilidade"
                  value={mine ? "mine" : "all"}
                  onChange={(v) => setMine(v === "mine")}
                  options={[
                    { value: "all", label: "Todos os indicadores" },
                    { value: "mine", label: "Meus indicadores" },
                  ]}
                />
              </div>
              {tab !== "kpis" && (
                <div className="w-48">
                  <Choice
                    label="Ciclo"
                    value={cycleId}
                    onChange={setCycleId}
                    options={[
                      { value: "active", label: "Ciclos ativos" },
                      { value: "all", label: "Todos os ciclos" },
                      { value: "archived", label: "Arquivados" },
                      ...data.cycles.map((c) => ({ value: c.id, label: c.name })),
                    ]}
                  />
                </div>
              )}
              <div className="flex flex-wrap items-center gap-1">
                {[
                  { value: "cards", label: "Cards", icon: LayoutGrid },
                  { value: "list", label: "Lista por responsável", icon: List },
                  { value: "chart", label: "Gráfico", icon: BarChart3 },
                  ...(tab === "okrs"
                    ? [{ value: "tree", label: "Árvore de alinhamento", icon: GitBranch }]
                    : []),
                  { value: "calendar", label: "Calendário", icon: CalendarDays },
                ].map((v) => (
                  <Button
                    key={v.value}
                    variant="ghost"
                    size="compactIcon"
                    aria-pressed={view === v.value}
                    title={v.label}
                    aria-label={v.label}
                    onClick={() => setView(v.value)}
                  >
                    <v.icon className="size-5" />
                  </Button>
                ))}
              </div>
            </div>
            {filters.summary}
            <section className="flex flex-wrap items-center gap-6">
              <div className="h-24 w-full sm:h-40 sm:w-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <XAxis
                      dataKey="name"
                      stroke="var(--muted-foreground)"
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip />
                    <Bar
                      dataKey="value"
                      name="Avanço %"
                      fill="var(--primary)"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {[
                { label: "Indicadores", value: metrics.length },
                {
                  label: "Avanço médio",
                  value: `${Math.round(metrics.reduce((s, m) => s + metricProgress(m.initial_value, m.target_value, m.current_value), 0) / (metrics.length || 1))}%`,
                },
                {
                  label: "Em risco / Atrasados",
                  value: metrics.filter((m) => m.confidence !== "on_track").length,
                },
                {
                  label: "Check-ins pendentes",
                  value: metrics.filter((m) => checkinDue(latest(m.id)?.recorded_at, new Date()))
                    .length,
                },
              ].map((t) => (
                <div key={t.label} className="text-center">
                  <p className="text-sm text-muted-foreground">{t.label}</p>
                  <p className="text-2xl font-semibold tabular-nums">{t.value}</p>
                </div>
              ))}
            </section>
            {view === "tree" && tab === "okrs" ? (
              <div className="space-y-3">{tree(null)}</div>
            ) : view === "chart" ? (
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={metrics.map((m) => ({
                      name: m.title,
                      progresso: metricProgress(m.initial_value, m.target_value, m.current_value),
                    }))}
                  >
                    <CartesianGrid stroke="var(--border)" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Bar dataKey="progresso" fill="var(--primary)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : view === "list" ? (
              <div className="space-y-3">
                {[...new Set(metrics.map((m) => m.responsible_id))].map((id) => (
                  <details key={id}>
                    <summary className="cursor-pointer py-3">
                      {userName(id)} · {metrics.filter((m) => m.responsible_id === id).length}
                    </summary>
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {metrics.filter((m) => m.responsible_id === id).map(metricCard)}
                    </div>
                  </details>
                ))}
              </div>
            ) : view === "calendar" ? (
              <div className="space-y-4">
                {[...new Set(metrics.map((m) => m.due_on ?? "Sem prazo"))].sort().map((date) => (
                  <section key={date} className="space-y-2">
                    <h2 className="text-sm font-medium">
                      {date === "Sem prazo"
                        ? date
                        : new Date(`${date}T12:00:00`).toLocaleDateString("pt-BR")}
                    </h2>
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {metrics.filter((m) => (m.due_on ?? "Sem prazo") === date).map(metricCard)}
                    </div>
                  </section>
                ))}
              </div>
            ) : (
              <div className="grid items-start gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {tab === "okrs" ? objectives.map(objectiveCard) : metrics.map(metricCard)}
              </div>
            )}
            {(tab === "okrs" ? objectives.length === 0 : metrics.length === 0) && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Nenhum indicador encontrado.
              </p>
            )}
          </>
        )}
        {tab === "cycles" && (
          <div className="space-y-3">
            {data.cycles.map((c) => (
              <div key={c.id} className="flex flex-wrap items-center gap-3 py-3">
                <CalendarDays className="size-5" />
                <div className="min-w-0 flex-1">
                  <p>{c.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(`${c.starts_on}T12:00:00`).toLocaleDateString("pt-BR")} —{" "}
                    {new Date(`${c.ends_on}T12:00:00`).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <Badge>{c.archived ? "Arquivado" : "Ativo"}</Badge>
                {canEdit && (
                  <>
                    {!c.archived &&
                      iconButton(`Editar ${c.name}`, Pencil, () =>
                        setEdit({ type: "cycle", row: c }),
                      )}
                    {iconButton(
                      `${c.archived ? "Restaurar" : "Arquivar"} ${c.name}`,
                      Archive,
                      async () => {
                        if (
                          await confirmAction(
                            `${c.archived ? "Restaurar" : "Arquivar"} o ciclo “${c.name}”?`,
                          )
                        )
                          mutation.mutate({ type: "archive", id: c.id, archived: !c.archived });
                      },
                    )}
                  </>
                )}
              </div>
            ))}
            {!data.cycles.length && (
              <p className="text-sm text-muted-foreground">Nenhum ciclo cadastrado.</p>
            )}
          </div>
        )}
      </main>
      <AppNavigation className={ml.nav} aria-label="Navegação de Indicadores">
        <div className={`mx-auto grid max-w-lg grid-cols-4 items-stretch bg-card p-2 ${ml.grid}`}>
          {tabs.map(({ value, label, icon: Icon }) => (
            <Button
              key={value}
              variant="ghost"
              aria-current={tab === value ? "page" : undefined}
              onClick={() => {
                setTab(value);
                setView("cards");
              }}
              className="h-auto min-w-0"
            >
              <span className="flex min-h-14 flex-col items-center justify-center gap-1">
                <span className="menu-icon">
                  <Icon className="size-5" />
                </span>
                <span className="text-xs">{label}</span>
              </span>
            </Button>
          ))}
        </div>
      </AppNavigation>
      {edit && (
        <IndicadorEditor
          key={`${edit.type}-${"row" in edit ? (edit.row?.id ?? "new") : "new"}`}
          selection={edit}
          data={data}
          onClose={() => setEdit(null)}
        />
      )}
      <Dialog
        open={!!history}
        onOpenChange={(o) => {
          if (!o) setHistory(null);
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Histórico · {history?.title}</DialogTitle>
          </DialogHeader>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={data.checkins
                  .filter((c) => c.metric_id === history?.id)
                  .slice()
                  .reverse()
                  .map((c) => ({
                    date: new Date(c.recorded_at).toLocaleDateString("pt-BR"),
                    value: c.value,
                  }))}
              >
                <CartesianGrid stroke="var(--border)" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line dataKey="value" stroke="var(--primary)" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          {data.checkins
            .filter((c) => c.metric_id === history?.id)
            .map((c) => (
              <div key={c.id} className="space-y-1 py-2">
                <p className="text-sm">
                  {new Date(c.recorded_at).toLocaleString("pt-BR")} · {userName(c.recorded_by)}
                </p>
                <p>
                  {history ? metricValue(c.value, history.measure, history.unit) : c.value} ·{" "}
                  {confidenceName(c.confidence)}
                </p>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">{c.comment}</p>
              </div>
            ))}
        </DialogContent>
      </Dialog>
    </div>
  );
}
