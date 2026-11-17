import { Suspense } from "react";
import { createFileRoute, redirect, useRouter, Link } from "@tanstack/react-router";
import { Building2, LayoutGrid, Phone, UsersRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/app-header";
import { MyioAppLogo } from "@/components/myio-app-logo";
import { Button } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppNavigation } from "@/components/ui/app-navigation";
import { useAppMenuLayout } from "@/components/cde/cde-menu-type";
import { useOrderedMenu } from "@/components/cde/menu-order";
import { OpdeskWorkspace } from "@/components/opdesk/opdesk-workspace";
import { LegacyCallsWorkspace } from "@/components/opdesk/legacy-calls";
import { opdeskOptions } from "@/components/opdesk/opdesk-data";

type Section = "painel" | "clientes" | "responsaveis" | "chamados";
export const Route = createFileRoute("/_authenticated/chamados")({
  validateSearch: (search:Record<string,unknown>):{chamado?:string;section?:Section}=>({
    chamado:typeof search.chamado==="string"?search.chamado:undefined,
    section:["painel","clientes","responsaveis","chamados"].includes(String(search.section))?search.section as Section:undefined,
  }),
  beforeLoad:async({context})=>{
    const [{data:access},{data:support}]=await Promise.all([supabase.from("user_app_access").select("app_key").eq("user_id",context.user.id).eq("app_key","chamados").maybeSingle(),supabase.rpc("is_customer_support_analyst",{_user_id:context.user.id})]);
    if(!access&&!support)throw redirect({to:"/portal"});
  },
  loader:({context})=>context.queryClient.ensureQueryData(opdeskOptions),
  component:OpdeskPage,
  errorComponent:OpdeskError,
  head:()=>({meta:[{title:"OpDesk | Tarefas e suporte myio ERP"},{name:"description",content:"Painel operacional de tarefas e sub-tarefas por cliente, responsáveis, prazos, histórico e chamados de suporte myio."},{property:"og:title",content:"OpDesk | Tarefas e suporte myio ERP"},{property:"og:description",content:"Gestão de tarefas técnicas e chamados no myio ERP, com quadro, listas, responsáveis e acompanhamento por cliente."},{property:"og:type",content:"website"},{name:"twitter:card",content:"summary"}]}),
});
function OpdeskPage(){
  const search=Route.useSearch();const navigate=Route.useNavigate();const section=search.chamado?"chamados":search.section??"painel";const layout=useAppMenuLayout("OpDesk");
  const tabs=useOrderedMenu("OpDesk","Barra inferior",[{value:"painel" as const,label:"Painel Global",icon:LayoutGrid},{value:"clientes" as const,label:"Clientes",icon:Building2},{value:"responsaveis" as const,label:"Responsáveis",icon:UsersRound},{value:"chamados" as const,label:"Chamados",icon:Phone}]);
  return <TooltipProvider><div className="min-h-screen bg-background"><AppHeader manualApp="OpDesk" logo={<MyioAppLogo appName="OpDesk" className="text-xl sm:text-2xl"/>}/><main className={`mx-auto max-w-[1500px] px-3 pb-28 pt-6 sm:px-6 ${layout.main}`}><Suspense fallback={<p className="text-sm text-muted-foreground">Carregando OpDesk...</p>}>{section==="chamados"?<LegacyCallsWorkspace chamado={search.chamado}/>:<OpdeskWorkspace section={section}/>}</Suspense></main><AppNavigation className={layout.nav} aria-label="Navegação do OpDesk"><div className={`mx-auto grid max-w-2xl grid-cols-4 items-stretch rounded-[1.75rem] border border-border bg-card p-1.5 shadow-lg ${layout.grid}`}>{tabs.map(item=><Button key={item.value} variant="ghost" aria-current={section===item.value?"page":undefined} className={`h-auto min-w-0 rounded-[1.35rem] p-0 ${section===item.value?"!bg-accent !text-primary":"!text-muted-foreground"}`} onClick={()=>void navigate({search:{section:item.value}})}><span className="flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 px-1"><span className="menu-icon"><item.icon className="size-5"/></span><span className="max-w-full text-center text-[10px] leading-tight">{item.label}</span></span></Button>)}</div></AppNavigation></div></TooltipProvider>;
}
function OpdeskError(){const router=useRouter();return <section className="space-y-4 p-6" role="alert"><p>Não foi possível carregar o OpDesk.</p><Button onClick={()=>void router.invalidate()}>Tentar novamente</Button><Button asChild variant="ghost"><Link to="/portal">Todos os apps</Link></Button></section>;}
