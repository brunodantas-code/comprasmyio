import { useQuery } from "@tanstack/react-query";
import { ShieldCheck, UsersRound, Briefcase } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { ErpAppAccessAdmin } from "@/components/erp-app-access-admin";
import { AccessProfileDefinitionsTab } from "@/components/access-profile-definitions-tab";
import { AccessProfilesTab } from "@/components/access-profiles-tab";
import { SiteSurveyProfilesAdmin } from "@/components/site-survey-profiles-admin";
import { UsersTab } from "@/components/mytosis/users-tab";
import { CodeAttendantsPanel } from "@/components/code-app-attendants";
import { AppSymbol } from "@/components/cde/app-tile";
import { accessProfileApps, type AccessCapabilities } from "@/lib/access-management";
import { UsersAdmin } from "./users-admin";
import { SurveyUsersAdmin } from "./survey-users-admin";
import { ProjectsAccess } from "@/components/projects/access";
import { IndicadoresAccess } from "@/components/indicadores/access";

const APP_NAMES: Record<string, string> = { supply: "Supply", cash_flow: "Finance", crm: "CRM", legal: "Legal", rh: "RH", site_survey: "Site Survey", chamados: "OpDesk", development: "Code", mytosis: "Mytosis", wishlist: "Wishlist", cde: "CDE", projects: "Projects", indicadores: "Indicadores" };
export type AccessSection = "usuarios" | "cadastro" | "perfis";

function MytosisAccess() {
  const query = useQuery({ queryKey: ["mytosis-access-users"], queryFn: async () => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) throw new Error("Sessão não encontrada");
    const [users, role] = await Promise.all([supabase.rpc("mytosis_users"), supabase.rpc("mytosis_role", { _user_id: auth.user.id })]);
    if (users.error) throw users.error; if (role.error) throw role.error;
    return { users: users.data ?? [], role: role.data as string | null };
  } });
  return query.isPending ? <p className="text-sm text-muted-foreground">Carregando acessos do Mytosis...</p> : query.isError ? <p className="text-sm text-destructive">Não foi possível carregar os acessos.</p> : <UsersTab data={query.data} />;
}

function CodeAccess() {
  const query = useQuery({ queryKey: ["code-access-admins"], queryFn: async () => {
    const [profiles, admins, accesses] = await Promise.all([supabase.rpc("code_conversation_users"), supabase.from("erp_admins").select("user_id"), supabase.from("user_app_access").select("user_id").eq("app_key", "development")]);
    for (const result of [profiles, admins, accesses]) if (result.error) throw result.error;
    const allowed = new Set((accesses.data ?? []).map(a => a.user_id));
    const ids = new Set((admins.data ?? []).filter(a => allowed.has(a.user_id)).map(a => a.user_id));
    return (profiles.data ?? []).filter(p => ids.has(p.id));
  } });
  return query.isPending ? <p className="text-sm text-muted-foreground">Carregando responsáveis...</p> : query.isError ? <p className="text-sm text-destructive">Não foi possível carregar os responsáveis.</p> : <section className="space-y-5"><h2 className="text-lg font-medium">Responsáveis pelos chamados · Code</h2><CodeAttendantsPanel admins={query.data} appNames={APP_NAMES} /></section>;
}

export function AccessWorkspace({ capabilities, section, app, onChange }: { capabilities: AccessCapabilities; section?: AccessSection; app?: string; onChange: (change: { section: AccessSection; app?: string }) => void }) {
  const apps = accessProfileApps(capabilities);
  const sections = [
    ...(capabilities.erpAdmin ? [{ value: "usuarios" as const, label: "Usuários e aplicativos", icon: UsersRound }] : []),
    ...(capabilities.supplyAdmin ? [{ value: "cadastro" as const, label: "Cadastro e cargos", icon: Briefcase }] : []),
    ...(apps.length ? [{ value: "perfis" as const, label: "Perfis por app", icon: ShieldCheck }] : []),
  ];
  const active = sections.some(s => s.value === section) ? section : sections[0]?.value;
  const selectedApp = apps.includes(app ?? "") ? app : apps[0];
  return <div className="space-y-6">
    <nav aria-label="Seções de Acessos" className="flex flex-wrap gap-2 border-b border-border pb-3">{sections.map(item => <Button key={item.value} variant="ghost" aria-pressed={active === item.value} onClick={() => onChange({ section: item.value, app: selectedApp })} className={active === item.value ? "font-semibold underline underline-offset-4" : "font-normal"}><item.icon className="size-4" />{item.label}</Button>)}</nav>
    {active === "usuarios" && capabilities.erpAdmin ? <ErpAppAccessAdmin /> : null}
    {active === "cadastro" && capabilities.supplyAdmin ? <UsersAdmin /> : null}
    {active === "perfis" ? <Tabs value={selectedApp} onValueChange={value => onChange({ section: "perfis", app: value })}>
      <nav aria-label="Aplicativos em Acessos" className="mb-5 flex flex-wrap gap-2">{apps.map(key => <Button key={key} variant="ghost" aria-pressed={selectedApp === key} className={selectedApp === key ? "font-semibold underline underline-offset-4" : "font-normal"} onClick={() => onChange({ section: "perfis", app: key })}><AppSymbol name={APP_NAMES[key] ?? key} className="size-4 shrink-0" />{APP_NAMES[key] ?? key}</Button>)}</nav>
      {capabilities.supplyAdmin ? <TabsContent value="supply"><div className="space-y-6"><AccessProfileDefinitionsTab /><AccessProfilesTab /></div></TabsContent> : null}
      {capabilities.surveyUsers || capabilities.surveyProfiles ? <TabsContent value="site_survey"><div className="space-y-6">{capabilities.surveyUsers ? <SurveyUsersAdmin /> : null}{capabilities.surveyProfiles ? <SiteSurveyProfilesAdmin /> : null}</div></TabsContent> : null}
      {capabilities.mytosisAdmin ? <TabsContent value="mytosis"><MytosisAccess /></TabsContent> : null}
      {capabilities.codeAdmin ? <TabsContent value="development"><CodeAccess /></TabsContent> : null}
      {capabilities.erpAdmin ? <><TabsContent value="projects"><ProjectsAccess /></TabsContent><TabsContent value="indicadores"><IndicadoresAccess /></TabsContent></> : null}
    </Tabs> : null}
  </div>;
}