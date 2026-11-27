import { applyMenuNames } from "@/components/cde/menu-names";
import { useMenuNames } from "@/components/cde/use-menu-names";
import { useEffect, useMemo, useState } from "react";
import { useAppDisplayName } from "@/components/cde/app-order-config";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import {
  Archive,
  CalendarDays,
  CheckCheck,
  ChevronDown,
  Gauge,
  GitBranch,
  History,
  LayoutGrid,
  List,
  LockKeyhole,
  Maximize2,
  Pencil,
  Target,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { confirmAction } from "@/components/confirm-dialog";
import { AppHeader } from "@/components/app-header";
import { MyioAppLogo } from "@/components/myio-app-logo";
import { AppNavigation } from "@/components/ui/app-navigation";
import { useAppMenuLayout } from "@/components/cde/cde-menu-type";
import { useMenuOrders, sortByMenuOrder } from "@/components/cde/menu-order";
import { CdeButton, CdeNumber } from "@/components/cde/cde-button";
import { Tooltip as TextTooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { useTableFilters, type FilterColumn } from "@/components/use-table-filters";
import { TableSortMenu } from "@/components/table-sort-menu";
import { sortIndicatorCards, type CardSort } from "./card-order";
import { indicatorDepartment } from "./department";
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
import { ImportedRecords } from "./imported-records";
import { ErpDisclosureRow } from "@/components/erp-disclosure-row";
import { UserPendingBars } from "@/components/central/user-bars";
import { indicadoresUserBars } from "@/lib/indicadores-user-bars";
import { importedField, historicalAuthor } from "@/lib/indicadores-import";
import { MilestoneTimeline } from "@/components/milestone-timeline";
const screen = "components/indicadores/dashboard.tsx";
function TruncatedText({ text }: { text: string }) {
  return <TooltipProvider><TextTooltip><TooltipTrigger asChild><span className="block w-full min-w-0 truncate" title={text}>{text}</span></TooltipTrigger><TooltipContent className="max-w-sm whitespace-normal">{text}</TooltipContent></TextTooltip></TooltipProvider>;
}
const confidenceName = (s: string | null) => CONFIDENCES.find((c) => c.value === s)?.label ?? (s || "Não informada na origem");
function Advance({ value }: { value: number }) {
  return (
    <div className="space-y-1">
      <p className="text-right text-xs tabular-nums">{value.toLocaleString("pt-BR")}%</p>
      <Progress value={value} className="h-1.5 bg-muted" aria-label="Avanço" />
    </div>
  );
}
export function IndicadoresDashboard() {
  const { data } = useSuspenseQuery(indicadoresOptions);
  const nameOf = useAppDisplayName();
  const appName = nameOf("indicadores");
  useEffect(() => { document.title = `myio ${appName}`; }, [appName]);
  const ml = useAppMenuLayout("Indicadores");
  const { data: menuOrders } = useMenuOrders();
  const menuNames = useMenuNames().data;
  const [tab, setTab] = useState("okrs");
  const [view, setView] = useState("cards");
  const [mine, setMine] = useState(false);
  const [cycleId, setCycleId] = useState("active");
  const [cardSorts, setCardSorts] = useState<Record<string, CardSort | undefined>>({});
  const [edit, setEdit] = useState<EditSelection | null>(null);
  const [historyFor, setHistoryFor] = useState<string | null>(null);
  const [focusedObjective, setFocusedObjective] = useState<{ id: string; metricIds: string[] } | null>(null);
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
  const progress = useMemo(() => new Map(data.objectives.map(o => [o.id, objectiveProgress(o.id,data.objectives,data.metrics)])),[data.objectives,data.metrics]);
  const checkinPending = (m: Metric) => checkinDue(data.checkins.find(c=>c.metric_id===m.id)?.recorded_at,new Date());
  const objectiveOwner = (o: Objective) => data.imported.filter(r=>r.source_table==='objective_owners' && importedField(r.data,'objective_id')===o.id).map(r=>importedField(data.imported.find(m=>m.source_table==='team_members' && importedField(m.data,'id')===importedField(r.data,'team_member_id'))?.data,'full_name')).filter(Boolean).join(', ') || importedField(o.source_metadata,'responsible_name') || userName(o.responsible_id);
  const metricColumns: FilterColumn<Metric>[] = [
    {key:'title',label:'Nome',value:m=>m.title},
    {key:'responsible',label:'Responsável',value:m=>importedField(m.source_metadata,'responsible_name') || userName(m.responsible_id)},
    {key:'department',label:'Departamento/Setor',value:m=>indicatorDepartment(m.objective_id,data.objectives)},
    {key:'confidence',label:'Criticidade',value:m=>confidenceName(m.source_metadata && !data.checkins.find(c=>c.metric_id===m.id)?.recorded_by ? null : m.confidence)},
    {key:'progress',label:'Avanço',kind:'number',value:m=>metricProgress(m.initial_value,m.target_value,m.current_value)},
    {key:'due',label:'Prazo',kind:'date',value:m=>m.due_on},
    {key:'current',label:'Valor atual',kind:'number',value:m=>m.current_value},
    {key:'target',label:'Meta',kind:'number',value:m=>m.target_value},
    {key:'checkin',label:'Check-in',value:m=>checkinPending(m)?'Pendente':'Atualizado'},
  ];
  const metricFilters = useTableFilters(data.metrics.filter(m =>
    (tab==='checkins' || m.kind===(tab==='kpis'?'kpi':'kr')) &&
    (m.objective_id===null || availableObjectives.some(o=>o.id===m.objective_id)) &&
    (!(mine || tab==='checkins') || m.responsible_id===data.userId)),metricColumns);
  const objectiveColumns: FilterColumn<Objective>[] = [
    {key:'title',label:'Nome',value:o=>o.title},
    {key:'responsible',label:'Responsável',value:objectiveOwner},
    {key:'cycle',label:'Ciclo',value:o=>data.cycles.find(c=>c.id===o.cycle_id)?.name ?? 'Sem ciclo'},
    {key:'scope',label:'Abrangência',value:o=>({empresa:'Empresa',departamento:'Departamento',equipe:'Equipe',individual:'Individual'}[o.scope] ?? o.scope)},
    {key:'alignment',label:'Departamento/Setor',value:o=>indicatorDepartment(o.id,data.objectives)},
    {key:'progress',label:'Avanço',kind:'number',value:o=>progress.get(o.id) ?? 0},
    {key:'krs',label:'Quantidade de KRs',kind:'number',value:o=>data.metrics.filter(m=>m.objective_id===o.id).length},
    {key:'visibility',label:'Confidencialidade',value:o=>o.confidential?'Confidencial':'Não confidencial'},
    {key:'checkin',label:'Check-in',value:o=>data.metrics.some(m=>m.objective_id===o.id && checkinPending(m))?'Pendente':'Atualizado'},
  ];
  const matching = new Set(metricFilters.filtered.map(m=>m.objective_id));
  const objectiveHasMatch = (id:string, seen=new Set<string>()):boolean => {
    if(seen.has(id)) return false; seen.add(id);
    return matching.has(id) || data.objectives.some(o=>o.parent_id===id && objectiveHasMatch(o.id,seen));
  };
  const objectiveFilters = useTableFilters(availableObjectives.filter(o=>!mine || objectiveHasMatch(o.id) || o.responsible_id===data.userId),objectiveColumns);
  const filters = tab==='okrs' ? objectiveFilters : metricFilters;
  const objectives = sortIndicatorCards(objectiveFilters.filtered,cardSorts['okrs'],objectiveColumns);
  const metricRows = tab==='okrs' ? metricFilters.filtered.filter(m=>objectives.some(o=>o.id===m.objective_id)) : metricFilters.filtered;
  const metrics = sortIndicatorCards(metricRows,cardSorts[tab],metricColumns);
  const sortColumns = tab==='okrs' ? objectiveColumns : metricColumns;
  const chartMetrics = data.metrics.filter(m =>
    (m.objective_id === null || availableObjectives.some(o => o.id === m.objective_id)) &&
    (!mine || m.responsible_id === data.userId));
  const chartObjectives = availableObjectives.filter(o => !mine || o.responsible_id === data.userId || chartMetrics.some(m => m.objective_id === o.id));
  const userBars = indicadoresUserBars(chartObjectives, chartMetrics, data.users);
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
  const historyEntries = (m: Metric) =>
    data.checkins
      .filter((c) => c.metric_id === m.id)
      .map((c) => ({
        id: c.id,
        created_at: c.recorded_at,
        text:
          `Check-in: ${metricValue(c.value, m.measure, m.unit)} · ${confidenceName(c.confidence)}` +
          (c.comment ? `\n${c.comment}` : "") +
          (importedField(c.source_metadata, "created_at")
            ? `\nRegistro original: ${new Date(importedField(c.source_metadata, "created_at")).toLocaleString("pt-BR")}`
            : "") +
          `\npor ${historicalAuthor(c.recorded_by, (id) => userName(id))}`,
      }));
  const historyPanel = (m: Metric) => {
    const entries = historyEntries(m);
    return (
      <div className="border-t border-border pt-3">
        <p className="mb-2 flex items-center gap-2 text-sm font-semibold"><History className="h-4 w-4" />Histórico</p>
        {entries.length ? <MilestoneTimeline entries={entries} /> : <p className="text-xs text-muted-foreground">Nenhum check-in registrado.</p>}
      </div>
    );
  };
  function metricRow(m: Metric, i: number) {
    const owner = data.objectives.find(o => o.id === m.objective_id);
    const archived = owner ? isArchived(owner) : false;
    const canCheckin = !archived && (m.responsible_id === data.userId || data.role === "admin");
    const slot = (node: React.ReactNode, width = "w-6") => (
      <span className={`flex shrink-0 items-center justify-center ${width}`}>{node}</span>
    );
    const empty = (Icon: typeof Pencil) => (
      <span aria-hidden="true" className="invisible flex h-6 w-6 items-center justify-center"><Icon className="size-3.5" /></span>
    );
    return (<div key={m.id}><div className="grid items-center gap-4 py-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_16rem]"><div className="min-w-0"><div className="flex items-start gap-2"><CdeNumber screen={screen} subcategory>{i+1}</CdeNumber><p className="text-sm">{m.title}</p></div><p className="mt-1 text-xs text-muted-foreground">{importedField(m.source_metadata,'responsible_name') || userName(m.responsible_id)}</p></div><div className="space-y-1 text-xs"><p>{metricValue(m.current_value,m.measure,m.unit)} · Meta: {metricValue(m.target_value,m.measure,m.unit)}</p>{m.due_on && <p className="text-muted-foreground">Prazo: {new Date(`${m.due_on}T12:00:00`).toLocaleDateString('pt-BR')}</p>}</div><Advance value={metricProgress(m.initial_value,m.target_value,m.current_value)} /><div className="flex items-center gap-2">{slot(canEdit && !archived ? iconButton(`Editar ${m.title}`,Pencil,()=>setEdit({type:'metric',row:m,kind:m.kind === 'kpi' ? 'kpi' : 'kr'})) : empty(Pencil))}{slot(canEdit ? iconButton(`Excluir ${m.title}`,Trash2,async()=>{if(await confirmAction(`Excluir o indicador “${m.title}”?`))mutation.mutate({type:'metric',id:m.id});}) : empty(Trash2))}{slot(canCheckin ? <Button onClick={()=>setEdit({type:'checkin',row:m})}><CheckCheck />Check-in</Button> : <span aria-hidden="true" className="invisible">Check-in</span>, "w-32")}{slot(iconButton(`Histórico de ${m.title}`,History,()=>setHistoryFor(v=>v===m.id?null:m.id)))}</div></div>{historyFor===m.id && historyPanel(m)}</div>);
  }
  function metricCard(m: Metric) {
    if (m.kind === "kr") return metricRow(m, metrics.findIndex(row => row.id === m.id));
    const pct = metricProgress(m.initial_value, m.target_value, m.current_value);
    const ownerObjective = data.objectives.find((o) => o.id === m.objective_id);
    const archived = ownerObjective ? isArchived(ownerObjective) : false;
    return (
      <Card key={m.id} classification={{ app: "indicadores", department: indicatorDepartment(m.objective_id, data.objectives), status: confidenceName(m.source_metadata && !latest(m.id)?.recorded_by ? null : m.confidence), responsible: m.responsible_id ?? (importedField(m.source_metadata, "responsible_name") || "Sem responsável") }} className={`flex min-w-0 flex-col ${historyFor === m.id ? "min-h-48" : "h-48"}`}>
        <CardHeader className="gap-0.5 space-y-0.5 p-3 pb-1 sm:p-3 sm:pb-1">
          <div className="flex items-start gap-2">
            <CardTitle className="indicadores-compact-title min-w-0 flex-1 text-xs font-normal leading-snug">
              <TruncatedText text={m.title} />
            </CardTitle>
          </div>
          <CardDescription className="indicadores-compact-subtitle min-w-0 text-xs"><TruncatedText text={importedField(m.source_metadata, "responsible_name") || userName(m.responsible_id)} /></CardDescription>
        </CardHeader>
        <CardContent className="flex min-h-0 flex-1 flex-col gap-1 p-3 pt-0 sm:p-3 sm:pt-0">
          <div className="flex min-w-0 items-center justify-between gap-2">
            <Badge className="min-w-0 truncate px-0 py-0 font-normal" title={confidenceName(m.source_metadata && !latest(m.id)?.recorded_by ? null : m.confidence)}>{confidenceName(m.source_metadata && !latest(m.id)?.recorded_by ? null : m.confidence)}</Badge>
            <span className="shrink-0 text-xs">{m.kind === "kpi" ? "KPI" : "Key Result"}</span>
          </div>
          <div className="flex min-w-0 justify-between gap-2 text-xs">
            <span className="min-w-0 truncate" title={metricValue(m.current_value, m.measure, m.unit)}>{metricValue(m.current_value, m.measure, m.unit)}</span>
            <span className="min-w-0 truncate text-muted-foreground" title={`Meta: ${metricValue(m.target_value, m.measure, m.unit)}`}>
              Meta: {metricValue(m.target_value, m.measure, m.unit)}
            </span>
          </div>
          <Advance value={pct} />
          {m.due_on && (
            <p className="text-xs text-muted-foreground">
              Prazo: {new Date(`${m.due_on}T12:00:00`).toLocaleDateString("pt-BR")}
            </p>
          )}
          <div className="mt-auto flex shrink-0 items-center gap-2">
            {canEdit && !archived && iconButton(`Editar ${m.title}`, Pencil, () => setEdit({ type: "metric", row: m, kind: m.kind === "kr" ? "kr" : "kpi" }))}
            {canEdit && iconButton(`Excluir ${m.title}`, Trash2, async () => { if (await confirmAction(`Excluir o indicador “${m.title}”?`)) mutation.mutate({ type: "metric", id: m.id }); })}
            {!archived && (m.responsible_id === data.userId || data.role === "admin") && (
              <Button variant="ghost" size="compactIcon" aria-label={`Check-in de ${m.title}`} title="Check-in" onClick={() => setEdit({ type: "checkin", row: m })}>
                <CheckCheck className="size-4" />
              </Button>
            )}
            {iconButton(`Histórico de ${m.title}`, History, () => setHistoryFor(v => v === m.id ? null : m.id))}
            {m.kind === "kpi" && canEdit && (
              <Button variant="ghost" size="compactIcon" aria-label={`Criar OKR de ${m.title}`} title="Criar OKR" onClick={() => setEdit({ type: "convert", row: m })}>
                <Target className="size-4" />
              </Button>
            )}
          </div>
          {historyFor === m.id && historyPanel(m)}
          {checkinDue(latest(m.id)?.recorded_at, new Date()) && !archived && (
            <p className="text-xs text-destructive">Check-in semanal pendente</p>
          )}
        </CardContent>
      </Card>
    );
  }
  function objectiveCard(o: Objective, index: number, visibleMetrics = metrics) {
    return (
      <div key={o.id} className="min-w-0 space-y-3">
        <Card classification={{ app: "indicadores", department: indicatorDepartment(o.id, data.objectives), status: data.metrics.some(m => m.objective_id === o.id && checkinPending(m)) ? "Check-in pendente" : "Atualizado", responsible: o.responsible_id ?? (importedField(o.source_metadata, "responsible_name") || "Sem responsável") }} className="flex h-48 min-w-0 flex-col">
          <CardHeader className="space-y-1 p-3 sm:p-3">
            <div className="flex items-center gap-2">
              <CdeNumber screen={screen}>{index + 1}</CdeNumber>
              <CardTitle className="indicadores-compact-title min-w-0 flex-1 text-xs font-normal leading-snug">
                <TruncatedText text={o.title} />
              </CardTitle>
              {o.confidential && (
                <LockKeyhole aria-label="Confidencial" className="size-4 shrink-0" />
              )}
            </div>
            <CardDescription className="indicadores-compact-subtitle min-w-0 truncate text-xs" title={`${data.imported.filter(r => r.source_table === "objective_owners" && importedField(r.data,"objective_id") === o.id).map(r => importedField(data.imported.find(m => m.source_table === "team_members" && importedField(m.data,"id") === importedField(r.data,"team_member_id"))?.data,"full_name")).filter(Boolean).join(", ") || importedField(o.source_metadata,"responsible_name") || userName(o.responsible_id)} · ${o.alignment_name ?? o.scope}`}>
              {data.imported.filter(r => r.source_table === "objective_owners" && importedField(r.data,"objective_id") === o.id).map(r => importedField(data.imported.find(m => m.source_table === "team_members" && importedField(m.data,"id") === importedField(r.data,"team_member_id"))?.data,"full_name")).filter(Boolean).join(", ") || importedField(o.source_metadata,"responsible_name") || userName(o.responsible_id)} ·{" "}
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
          <CardContent className="mt-auto space-y-2 p-3 pt-0 sm:p-3 sm:pt-0">
            {o.parent_id && (
              <p className="truncate text-xs text-muted-foreground" title={data.objectives.find((p) => p.id === o.parent_id)?.title}>
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
                  {iconButton(`Editar ${o.title}`, Pencil, () => setEdit({ type: "objective", row: o }))}
                  {iconButton(`Excluir ${o.title}`, Trash2, async () => { if (await confirmAction(`Excluir o objetivo “${o.title}”? Objetivos com resultados ou desdobramentos precisam ser reorganizados antes.`)) mutation.mutate({ type: "objective", id: o.id }); })}
                  {iconButton(`Desdobrar ${o.title}`, GitBranch, () =>
                    setEdit({ type: "objective", parent: o }),
                  )}
                </>
              )}
              <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground" title={data.cycles.find((c) => c.id === o.cycle_id)?.name ?? "Sem ciclo"}>
                {data.cycles.find((c) => c.id === o.cycle_id)?.name ?? "Sem ciclo"}
              </span>
              <span className="shrink-0 text-xs tabular-nums text-muted-foreground" aria-label={`${visibleMetrics.filter(m => m.objective_id === o.id).length} KRs`}>{visibleMetrics.filter(m => m.objective_id === o.id).length} KRs</span>
              <Button variant="ghost" size="compactIcon" aria-label={`Expandir OKR ${o.title}`} title="Expandir OKR" onClick={() => setFocusedObjective({ id: o.id, metricIds: visibleMetrics.filter(m => m.objective_id === o.id).map(m => m.id) })}><Maximize2 /></Button>
            </div>
          </CardContent>
        </Card>
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
  const tabs = applyMenuNames(sortByMenuOrder(
    [
      { value: "okrs", label: "OKRs", icon: Target },
      { value: "kpis", label: "KPIs", icon: Gauge },
      { value: "checkins", label: "Check-ins", icon: CheckCheck },
      { value: "cycles", label: "Ciclos", icon: CalendarDays },
      { value: "areas", label: "Áreas, equipe e reuniões", icon: Users },
    ],
    menuOrders?.["Indicadores|Barra inferior"],
  ), menuNames, "Indicadores", "Barra inferior");
  return (
    <div className="min-h-screen bg-background">
      <AppHeader logo={<MyioAppLogo appName={appName} />} />
      <main className={`mx-auto max-w-[1500px] space-y-5 px-4 pb-28 pt-6 sm:px-6 ${ml.main}`}>
        <section className="erp-screen-block space-y-5">
        <CardHeader className="flex flex-col gap-4 p-0 sm:flex-row sm:items-center sm:justify-between sm:p-0">
          <div className="min-w-0 space-y-1">
            <CardTitle>
              {tab === "okrs"
                ? "Objetivos e Key Results"
                : tab === "kpis"
                  ? "Indicadores de desempenho"
                  : tab === "checkins"
                    ? "Check-ins semanais"
                    : tab === "areas"
                      ? "Áreas, equipe e reuniões"
                      : "Ciclos e períodos"}
            </CardTitle>
            <CardDescription>
              {tab === "okrs"
                ? "Acompanhe os objetivos e os resultados-chave do ciclo selecionado."
                : tab === "kpis"
                  ? "Acompanhe os indicadores de desempenho, suas metas e responsáveis."
                  : tab === "checkins"
                    ? "Acompanhe os registros semanais de avanço de cada indicador."
                    : tab === "areas"
                      ? "Consulte e corrija as áreas, as pessoas da equipe e as reuniões trazidas da origem."
                      : "Gerencie os períodos de vigência dos objetivos e indicadores."}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {canEdit && tab === "cycles" && (
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
        </CardHeader>
        {tab !== "cycles" && tab !== "areas" && (
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
              <div className="flex flex-wrap items-center gap-1 [&_button]:!h-8 [&_button]:!w-8 [&_button]:!min-w-8 [&_button]:!px-0 [&_svg]:!size-5 erp-list-toolbar">
                {[
                  { value: "cards", label: "Cards", icon: LayoutGrid },
                  { value: "list", label: "Lista por responsável", icon: List },
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
                {filters.menu}<TableSortMenu iconOnly columns={sortColumns} {...(cardSorts[tab] ? {value:cardSorts[tab]} : {})} onChange={value=>setCardSorts(current=>({...current,[tab]:value}))} />
            {canEdit && tab !== "checkins" && tab !== "cycles" && (
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
            {filters.summary}
            <section className="flex flex-wrap items-center gap-6">
              <UserPendingBars
                data={userBars}
                title="OKRs e KPIs por usuário"
                expandLabel="Expandir gráfico de OKRs e KPIs por usuário"
                itemLabel="OKRs e KPIs"
                screen={screen}
                renderDetails={id => {
                  const user = userBars.find(u => u.id === id);
                  if (!user) return null;
                  const ownedObjectives = chartObjectives.filter(o => user.objectiveIds.has(o.id));
                  const ownedKpis = chartMetrics.filter(m => user.metricIds.has(m.id) && m.kind === 'kpi');
                  return <div className="space-y-4 py-3">
                    {ownedObjectives.length > 0 && <><h2 className="text-sm text-muted-foreground">OKRs · {ownedObjectives.length}</h2><div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,16rem),16rem))] items-start gap-3">{ownedObjectives.map((o,index) => objectiveCard(o,index,chartMetrics))}</div></>}
                    {ownedKpis.length > 0 && <><h2 className="text-sm text-muted-foreground">KPIs · {ownedKpis.length}</h2><div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,16rem),16rem))] items-start gap-3">{ownedKpis.map(metricCard)}</div></>}
                  </div>;
                }}
              />
              <section className="w-full overflow-hidden rounded-md border border-border bg-card shadow-sm" aria-label="Resumo dos indicadores"><header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3"><h2 className="truncate text-xs font-bold uppercase text-muted-foreground">Indicadores</h2><Badge>Atualizado</Badge></header><div className="divide-y divide-border p-2 lg:grid lg:grid-cols-4 lg:divide-x lg:divide-y-0">{[
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
                <div key={t.label} className={`flex min-h-12 items-center justify-between gap-3 px-3 py-2.5 lg:min-h-16 lg:px-4 ${Number(String(t.value).replace('%','')) > 0 ? 'bg-myio-green/5' : ''}`}>
                  <div className="flex min-w-0 items-center gap-3"><span className={`h-6 w-1.5 shrink-0 rounded-full ${Number(String(t.value).replace('%','')) > 0 ? 'bg-myio-green' : 'bg-muted-foreground/25'}`} aria-hidden="true" /><p className="truncate text-sm text-muted-foreground" title={t.label}>{t.label}</p></div>
                  <strong className="shrink-0 text-lg leading-none tabular-nums">{t.value}</strong>
                </div>
              ))}</div></section>
            </section>
            {view === "tree" && tab === "okrs" ? (
              <div className="space-y-3">{tree(null)}</div>
            ) : view === "list" ? (
              <div className="space-y-2">
                {tab === "okrs" ? [...new Set(objectives.map(objectiveOwner))].map(name => {
                  const rows = objectives.filter(o => objectiveOwner(o) === name);
                  return <ErpDisclosureRow key={name} name={name} meta={`${rows.length} OKRs`} label={`OKRs de ${name}`} screen={screen}><div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,16rem),16rem))] items-start gap-3">{rows.map((o,i) => objectiveCard(o,i))}</div></ErpDisclosureRow>;
                }) : [...new Set(metrics.map(m => m.responsible_id))].map(id => {
                  const rows = metrics.filter(m => m.responsible_id === id);
                  return <ErpDisclosureRow key={id} name={userName(id)} meta={`${rows.length} indicadores`} label={`indicadores de ${userName(id)}`} screen={screen}><div className={tab === "kpis" ? "grid grid-cols-[repeat(auto-fill,minmax(min(100%,16rem),16rem))] items-start gap-3" : "divide-y divide-border"}>{rows.map((m,i) => tab === "kpis" ? metricCard(m) : metricRow(m,i))}</div></ErpDisclosureRow>;
                })}
              </div>
            ) : view === "calendar" ? (
              <div className="space-y-4">
                {tab === "okrs" ? [...new Set(objectives.map(o => o.cycle_id))].map(id => {
                  const cycle = data.cycles.find(c => c.id === id);
                  return <section key={id} className="space-y-2"><h2 className="text-sm font-medium">{cycle ? `${cycle.name} · ${new Date(`${cycle.starts_on}T12:00:00`).toLocaleDateString("pt-BR")} — ${new Date(`${cycle.ends_on}T12:00:00`).toLocaleDateString("pt-BR")}` : "Sem ciclo"}</h2><div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,16rem),16rem))] items-start gap-3">{objectives.filter(o => o.cycle_id === id).map((o,i) => objectiveCard(o,i))}</div></section>;
                }) : [...new Set(metrics.map(m => m.due_on ?? "Sem prazo"))].sort().map(date => (
                  <section key={date} className="space-y-2"><h2 className="text-sm font-medium">{date === "Sem prazo" ? date : new Date(`${date}T12:00:00`).toLocaleDateString("pt-BR")}</h2>
                    <div className={tab === "kpis" ? "grid grid-cols-[repeat(auto-fill,minmax(min(100%,16rem),16rem))] items-start gap-3" : "divide-y divide-border"}>
                      {metrics.filter(m => (m.due_on ?? "Sem prazo") === date).map((m,i) => tab === "kpis" ? metricCard(m) : metricRow(m,i))}
                    </div>
                  </section>
                ))}
              </div>
            ) : (
              <div className={tab === "checkins" ? "divide-y divide-border" : "grid grid-cols-[repeat(auto-fill,minmax(min(100%,16rem),16rem))] items-start gap-3"}>
                {tab === "okrs" ? objectives.map((o, index) => objectiveCard(o, index)) : metrics.map((m,i) => tab === "checkins" ? metricRow(m,i) : metricCard(m))}
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
        {tab === "areas" && (
          <ImportedRecords
            data={data}
            canEdit={data.role === "admin"}
            resolveUser={(id) => userName(id)}
          />
        )}
        </section>
      </main>
      {focusedObjective && (() => { const o = data.objectives.find(x => x.id === focusedObjective.id); if (!o) return null; const rows = data.metrics.filter(m => m.objective_id === o.id && focusedObjective.metricIds.includes(m.id)); return <Dialog open onOpenChange={open => { if (!open) setFocusedObjective(null); }}><DialogContent defaultExpanded className="content-start"><DialogHeader><DialogTitle>{o.title}</DialogTitle></DialogHeader><p className="text-sm text-muted-foreground">{importedField(o.source_metadata,'responsible_name') || userName(o.responsible_id)} · {data.cycles.find(c => c.id === o.cycle_id)?.name ?? 'Sem ciclo'}</p>{o.description && <p className="whitespace-pre-wrap text-sm">{o.description}</p>}<div className="max-w-xl"><Advance value={progress.get(o.id) ?? 0} /></div><header className="flex items-center justify-between gap-3"><h2 className="text-base">Key Results · {rows.length}</h2>{canEdit && !isArchived(o) && <CdeButton group="plus" screen={screen} title="Novo Key Result" aria-label={`Novo KR em ${o.title}`} onClick={() => setEdit({ type:'metric',kind:'kr',objective:o })} />}</header><div className="divide-y divide-border">{rows.map(metricRow)}{!rows.length && <p className="py-6 text-sm text-muted-foreground">Nenhum Key Result neste objetivo.</p>}</div></DialogContent></Dialog>; })()}
      <AppNavigation className={ml.nav} aria-label={`Navegação de ${appName}`}>
        <div className={`mx-auto grid max-w-2xl grid-cols-5 items-stretch rounded-[1.75rem] border border-border bg-card/95 p-1.5 shadow-xl backdrop-blur supports-[backdrop-filter]:bg-card/90 ${ml.grid}`}>
          {tabs.map(({ value, label, icon: Icon }) => (
            <Button
              key={value}
              variant="ghost"
              aria-current={tab === value ? "page" : undefined}
              onClick={() => {
                setTab(value);
                setView("cards");
              }}
              className={`h-auto min-w-0 rounded-[1.35rem] p-0 shadow-none ${tab === value ? "!bg-primary/15 !text-primary hover:!bg-primary/20 hover:!text-primary" : "!bg-transparent !text-muted-foreground hover:!bg-muted hover:!text-foreground"}`}
            >
              <span className="flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 px-1">
                <span className="menu-icon">
                  <Icon className="h-5 w-5 shrink-0" />
                </span>
                <span className="max-w-full truncate text-[10px] font-semibold leading-none">{label}</span>
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
    </div>
  );
}
