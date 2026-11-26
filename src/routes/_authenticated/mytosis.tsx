import { applyMenuNames } from "@/components/cde/menu-names";
import { useMenuNames } from "@/components/cde/use-menu-names";
import { useAppMenuLayout } from "@/components/cde/cde-menu-type";
import { AppNavigation } from "@/components/ui/app-navigation";
import { useMenuOrders, sortByMenuOrder } from "@/components/cde/menu-order";
import { useEffect, useState } from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { BookOpen, Workflow } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { AppHeader } from "@/components/app-header";
import { MyioAppLogo } from "@/components/myio-app-logo";
import { useMytosisData } from "@/components/mytosis/use-mytosis";
import { Flowchart } from "@/components/mytosis/flowchart";
import { ProcessesTab } from "@/components/mytosis/processes-tab";
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
      { name: "description", content: "Fluxogramas e processos da myio, com etapas vinculadas e documentação de procedimentos." },
      { property: "og:title", content: "Mytosis | Fluxogramas e processos" },
      { property: "og:description", content: "Fluxogramas e processos documentados da plataforma myio ERP." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type Section = "flow" | "processes";

function MytosisPage() {
  const ml = useAppMenuLayout("Mytosis");
  const { data, isLoading } = useMytosisData();
  const search = Route.useSearch();
  const [pendingTask, setPendingTask] = useState<TaskSelection>(null);
  const [section, setSection] = useState<Section>("flow");
  const [objectiveId, setObjectiveId] = useState("");
  const [focusLocator, setFocusLocator] = useState<number | null>(null);
  const [dialog, setDialog] = useState<NodeDialogState>(null);

  useEffect(() => {
    if (!data || !search.node) return;
    const node = data.nodes.find((item) => item.id === search.node);
    if (!node) return;
    const root = rootObjectiveOf(node.id, data.nodes);
    if (node.is_process) { setSection("flow"); setObjectiveId(root?.id ?? node.id); setFocusLocator(node.locator); }
    else return;
    if (search.task) setPendingTask({ nodeId: node.id, taskId: search.task });
    else setDialog({ mode: "edit", node });
  }, [data?.nodes, search.node, search.task]);

  const { data: menuOrders } = useMenuOrders();
  const menuNames = useMenuNames().data;
  if (isLoading || !data) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Carregando...</div>;
  const canEdit = data.role === "admin" || data.role === "editor";
  const currentObjective = objectiveId || data.nodes.find((n) => !n.parent_id && n.is_process)?.id || "";
  const tabs = [
    { value: "flow" as const, label: "Fluxogramas", icon: Workflow },
    { value: "processes" as const, label: "Processos", icon: BookOpen },
  ];
  const orderedTabs = applyMenuNames(sortByMenuOrder(tabs, menuOrders?.["Mytosis|Barra inferior"]), menuNames, "Mytosis", "Barra inferior");

  return (
    <div className="min-h-screen bg-background">
      <AppHeader manualApp="Mytosis" logo={<MyioAppLogo appName="Mytosis" className="text-xl sm:text-2xl" />} />
      <main className={`mx-auto max-w-[1500px] px-4 pb-28 pt-6 sm:px-6 ${ml.main}`}>
        <section className="erp-screen-block space-y-5">
        {section === "flow" ? <Flowchart process data={data} canEdit={canEdit} objectiveId={currentObjective} onObjectiveChange={setObjectiveId} focusLocator={focusLocator} onFocusHandled={() => setFocusLocator(null)} openDialog={setDialog} /> : null}
        {section === "processes" ? <ProcessesTab data={data} canEdit={canEdit} /> : null}
        </section>
      </main>
      <BoxTaskDialog selection={pendingTask} onSelect={setPendingTask} onClose={() => setPendingTask(null)} data={data} canEdit={canEdit} />
      <NodeDialog state={dialog} onClose={() => setDialog(null)} data={data} canEdit={canEdit} />
      <AppNavigation className={ml.nav} aria-label="Navegação do Mytosis">
        <div className={`mx-auto grid max-w-lg grid-cols-2 items-stretch rounded-[1.75rem] border border-border bg-card/95 p-1.5 shadow-xl backdrop-blur supports-[backdrop-filter]:bg-card/90 ${ml.grid}`}>
          {orderedTabs.map(({ value, label, icon: Icon }) => {
            const active = section === value;
            return <Button key={value} type="button" variant="ghost" className={`h-auto min-w-0 rounded-[1.35rem] p-0 shadow-none ${active ? "!bg-primary/15 !text-primary hover:!bg-primary/20 hover:!text-primary" : "!bg-transparent !text-muted-foreground hover:!bg-muted hover:!text-foreground"}`} onClick={() => setSection(value)} aria-current={active ? "page" : undefined}><span className="flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 px-1"><span className="menu-icon"><Icon className="h-5 w-5 shrink-0" /></span><span className="max-w-full truncate text-[10px] font-semibold leading-none">{label}</span></span></Button>;
          })}
        </div>
      </AppNavigation>
    </div>
  );
}
