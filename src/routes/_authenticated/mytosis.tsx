import { useMenuOrders, sortByMenuOrder } from "@/components/cde/menu-order";
import { useEffect, useState } from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { BookOpen, ChevronLeft, Gauge, Target, UsersRound, Workflow } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { AppHeader } from "@/components/app-header";
import { MyioAppLogo } from "@/components/myio-app-logo";
import { useMytosisData } from "@/components/mytosis/use-mytosis";
import { Flowchart } from "@/components/mytosis/flowchart";
import { OkrsTab } from "@/components/mytosis/okrs-tab";
import { UsersTab } from "@/components/mytosis/users-tab";
import { ProcessesTab } from "@/components/mytosis/processes-tab";
import { KpisTab } from "@/components/mytosis/kpis-tab";
import { BoxTaskDialog, type TaskSelection } from "@/components/mytosis/box-tasks";
import { rootObjectiveOf } from "@/lib/mytosis";
import { NodeDialog, type NodeDialogState } from "@/components/mytosis/node-dialog";

export const Route = createFileRoute("/_authenticated/mytosis")({
  validateSearch: (search: Record<string, unknown>): { node?: string; task?: string } => ({ node: typeof search.node === "string" ? search.node : undefined, task: typeof search.task === "string" ? search.task : undefined }),
  beforeLoad: async ({ context }) => {
    const { data } = await supabase.rpc("mytosis_role", { _user_id: context.user.id });
    if (!data) throw redirect({ to: "/portal" });
  },
  component: MytosisPage,
  head: () => ({
    meta: [
      { title: "Mytosis | Fluxogramas e processos" },
      { name: "description", content: "OKRs, tarefas e fluxogramas de processos com caminho crítico e pendências por responsável." },
      { property: "og:title", content: "Mytosis | Fluxogramas e processos" },
      { property: "og:description", content: "Ferramenta de OKRs e To Do's da plataforma myio ERP." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type Section = "okrs" | "flow" | "processes" | "kpis" | "users";

function MytosisPage() {
  const { data, isLoading } = useMytosisData();
  const search = Route.useSearch();
  const [pendingTask, setPendingTask] = useState<TaskSelection>(null);
  const [section, setSection] = useState<Section>("okrs");
  const [objectiveId, setObjectiveId] = useState("");
  const [okrId, setOkrId] = useState("");
  const [okrFocus, setOkrFocus] = useState<number | null>(null);
  const [focusLocator, setFocusLocator] = useState<number | null>(null);
  const [dialog, setDialog] = useState<NodeDialogState>(null);

  useEffect(() => {
    if (!data || !search.node) return;
    const node = data.nodes.find((item) => item.id === search.node);
    if (!node) return;
    const root = rootObjectiveOf(node.id, data.nodes);
    if (node.is_process) { setSection("flow"); setObjectiveId(root?.id ?? node.id); setFocusLocator(node.locator); }
    else { setSection("okrs"); setOkrId(root?.id ?? node.id); setOkrFocus(node.locator); }
    if (search.task) setPendingTask({ nodeId: node.id, taskId: search.task });
    else setDialog({ mode: "edit", node });
  }, [data?.nodes, search.node, search.task]);

  const { data: menuOrders } = useMenuOrders();
  if (isLoading || !data) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Carregando...</div>;
  const canEdit = data.role === "admin" || data.role === "editor";
  const currentObjective = objectiveId || data.nodes.find((n) => !n.parent_id && n.is_process)?.id || "";
  const tabs = [
    { value: "okrs" as const, label: "OKRs", icon: Target },
    { value: "flow" as const, label: "Fluxogramas", icon: Workflow },
    { value: "processes" as const, label: "Processos", icon: BookOpen },
    { value: "kpis" as const, label: "KPIs", icon: Gauge },
    { value: "users" as const, label: "Usuários", icon: UsersRound },
  ];
  const orderedTabs = sortByMenuOrder(tabs, menuOrders?.["Mytosis|Barra inferior"]);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader logo={<MyioAppLogo appName="Mytosis" className="text-xl sm:text-2xl" />} />
      <main className="mx-auto max-w-[1500px] px-4 pb-28 pt-6 sm:px-6">
        {section === "okrs" && !okrId ? <OkrsTab data={data} canEdit={canEdit} openDialog={setDialog} onOpenObjective={setOkrId} onLocate={(loc) => { const n = data.nodes.find((x) => x.locator === loc); let r = n; while (r?.parent_id) { const parent = r.parent_id; r = data.nodes.find((x) => x.id === parent); } if (r) { setOkrId(r.id); setOkrFocus(loc); } }} /> : null}
        {section === "okrs" && okrId ? <div className="space-y-3"><Button variant="ghost" className="text-primary" onClick={() => setOkrId("")}><ChevronLeft className="h-4 w-4" />Voltar aos OKRs</Button><Flowchart process={false} data={data} canEdit={canEdit} objectiveId={okrId} onObjectiveChange={setOkrId} focusLocator={okrFocus} onFocusHandled={() => setOkrFocus(null)} openDialog={setDialog} /></div> : null}
        {section === "flow" ? <Flowchart process data={data} canEdit={canEdit} objectiveId={currentObjective} onObjectiveChange={setObjectiveId} focusLocator={focusLocator} onFocusHandled={() => setFocusLocator(null)} openDialog={setDialog} /> : null}
        {section === "users" ? <UsersTab data={data} /> : null}
        {section === "processes" ? <ProcessesTab data={data} canEdit={canEdit} /> : null}
        {section === "kpis" ? <KpisTab data={data} canEdit={canEdit} /> : null}
      </main>
      <BoxTaskDialog selection={pendingTask} onSelect={setPendingTask} onClose={() => setPendingTask(null)} data={data} canEdit={canEdit} />
      <NodeDialog state={dialog} onClose={() => setDialog(null)} data={data} canEdit={canEdit} />
      <nav className="fixed inset-x-3 bottom-3 z-50" aria-label="Navegação do Mytosis">
        <div className="mx-auto grid max-w-lg grid-cols-5 items-stretch rounded-[1.75rem] border border-border bg-card/95 p-1.5 shadow-xl backdrop-blur supports-[backdrop-filter]:bg-card/90">
          {orderedTabs.map(({ value, label, icon: Icon }) => {
            const active = section === value;
            return <Button key={value} type="button" variant="ghost" className={`h-auto min-w-0 rounded-[1.35rem] p-0 shadow-none ${active ? "!bg-primary/15 !text-primary hover:!bg-primary/20 hover:!text-primary" : "!bg-transparent !text-muted-foreground hover:!bg-muted hover:!text-foreground"}`} onClick={() => setSection(value)} aria-current={active ? "page" : undefined}><span className="flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 px-1"><Icon className="h-5 w-5 shrink-0" /><span className="max-w-full truncate text-[10px] font-semibold leading-none">{label}</span></span></Button>;
          })}
        </div>
      </nav>
    </div>
  );
}
