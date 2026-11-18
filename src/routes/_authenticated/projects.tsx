import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/app-header";
import { MyioAppLogo } from "@/components/myio-app-logo";
import { ProjectsWorkspace } from "@/components/projects/workspace";
import { projectsOptions } from "@/components/projects/data";
export const Route=createFileRoute("/_authenticated/projects")({
 beforeLoad:async({context})=>{const result=await supabase.from("user_app_access").select("app_key").eq("user_id",context.user.id).eq("app_key","projects").maybeSingle();if(result.error)throw result.error;if(!result.data)throw redirect({to:"/portal"});},
 loader:({context})=>context.queryClient.ensureQueryData(projectsOptions()),
 component:ProjectsPage,
 head:()=>({meta:[{title:"myio Projects | Planejamento e controle de projetos"},{name:"description",content:"Escopo, cronogramas, Gantt, equipes, recursos, orçamento e linhas de base dos projetos internos e em clientes da myio."},{property:"og:title",content:"myio Projects | Planejamento e controle de projetos"},{property:"og:description",content:"Portfólio consolidado e controle de prazos, entregáveis e custos dos projetos myio."},{property:"og:type",content:"website"},{name:"twitter:card",content:"summary"}]}),
});
function ProjectsPage(){const {user}=Route.useRouteContext();return <div className="min-h-screen bg-background"><AppHeader logo={<MyioAppLogo appName="Projects" className="text-xl sm:text-2xl"/>}/><ProjectsWorkspace userId={user.id}/></div>;}