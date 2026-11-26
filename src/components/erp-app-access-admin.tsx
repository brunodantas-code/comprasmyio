import { CdeDisclosureIcon } from "@/components/cde/cde-button";
import { Button } from "@/components/ui/button";
import { confirmAction } from "@/components/confirm-dialog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useTableFilters } from "@/components/use-table-filters";
import { toast } from "sonner";
import { getErpUsersAndAccess, setErpAppAccess, setErpUserActive } from "@/lib/erp-admin.functions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useAppDisplayName } from "@/components/cde/app-order-config";
import { AccessUserRow } from "@/components/access/access-user-row";

const APPS = [
  { key: "spend", label: "Spend" },
  { key: "supply", label: "Supply" },
  { key: "cash_flow", label: "Finance" },
  { key: "crm", label: "CRM" },
  { key: "legal", label: "Legal" },
  { key: "rh", label: "RH" },
  { key: "site_survey", label: "Site Survey" },
  { key: "chamados", label: "OpDesk" },
  { key: "development", label: "Code" },
  { key: "mytosis", label: "Mytosis" },
  { key: "indicadores", label: "Indicadores" },
  { key: "wishlist", label: "Wishlist" },
  { key: "projects", label: "Projects" },
  { key: "cde", label: "CDE" },
] as const;

export function ErpAppAccessAdmin({ appKey }: { appKey?: string }) {
  const queryClient = useQueryClient();
  const fetchUsers = useServerFn(getErpUsersAndAccess);
  const saveAccess = useServerFn(setErpAppAccess);
  const { data, isLoading } = useQuery({
    queryKey: ["erp-users-and-access"],
    queryFn: () => fetchUsers(),
  });
  const update = useMutation({
    mutationFn: saveAccess,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["erp-users-and-access"] });
      queryClient.invalidateQueries({ queryKey: ["my-erp-access"] });
      toast.success("Acesso ao aplicativo atualizado");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const [open, setOpen] = useState<Set<string>>(new Set());
  const toggle = (id: string) => setOpen((cur) => { const n = new Set(cur); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const saveActive = useServerFn(setErpUserActive);
  const activate = useMutation({
    mutationFn: (v: { data: { userId: string; active: boolean } }) => saveActive(v),
    onSuccess: (_r, v: { data: { userId: string; active: boolean } }) => {
      queryClient.invalidateQueries({ queryKey: ["erp-users-and-access"] });
      toast.success(v.data.active ? "Usuário ativado" : "Usuário inativado: não consegue mais entrar");
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const nameOf = useAppDisplayName();
  const apps = appKey ? APPS.filter(app => app.key === appKey) : APPS;
  const users = [...(data?.users ?? [])].sort((a, b) => Number(b.is_active) - Number(a.is_active));
  const accessSet = new Set((data?.accesses ?? []).map((access) => `${access.user_id}:${access.app_key}`));
  const userFilters = useTableFilters(users, [
    { key: "name", label: "Nome", value: (u) => u.full_name ?? "" },
    { key: "email", label: "E-mail", value: (u) => u.email ?? "" },
    { key: "status", label: "Situação", value: (u) => (u.is_active ? "Ativo" : "Inativo") },
    ...apps.map((app) => ({ key: `app_${app.key}`, label: nameOf(app.key), value: (u: (typeof users)[number]) => (accessSet.has(`${u.id}:${app.key}`) ? "Com acesso" : "Sem acesso") })),
  ]);
  const filtered = userFilters.filtered;
  const adminSet = new Set(data?.adminIds ?? []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5" />{appKey ? `Acessos · ${nameOf(appKey)}` : "Usuários e aplicativos"}{userFilters.menu}</CardTitle>
        <CardDescription>{appKey ? `Usuários com e sem acesso ao ${nameOf(appKey)}.` : "Libere os aplicativos do ERP sem alterar cargos ou perfis internos de cada app."}</CardDescription>
      </CardHeader>
      <CardContent>
        {userFilters.summary}
        {isLoading ? <p className="text-sm text-muted-foreground">Carregando usuários...</p> : null}
        {!isLoading ? <p className="mb-2 text-xs text-muted-foreground">{filtered.length} de {users.length} usuários</p> : null}
        <div className="space-y-2">
          {filtered.map((user) => {
            const isOpen = open.has(user.id);
            const appControls = apps.map((app) => {
              const checked = accessSet.has(`${user.id}:${app.key}`);
              const control = (
                <div className="flex shrink-0 items-center gap-2">
                  <span className="w-12 text-right text-xs text-muted-foreground">{checked ? "Ativo" : "Inativo"}</span>
                  <Switch
                    checked={checked}
                    disabled={update.isPending || !user.is_active}
                    onCheckedChange={(allowed) => update.mutate({ data: { userId: user.id, appKey: app.key, allowed } })}
                    aria-label={`${nameOf(app.key)} para ${user.full_name || user.email || "usuário"}`}
                  />
                </div>
              );
              return { app, control };
            });
            return (
              <AccessUserRow
                key={user.id}
                name={user.full_name || "Sem nome"}
                email={user.email}
                inactive={!user.is_active}
                badges={adminSet.has(user.id) ? <Badge variant="outline">Admin do ERP</Badge> : null}
                {...(!appKey ? { onNameClick: () => toggle(user.id) } : {})}
                controls={appKey ? appControls[0]?.control : (
                  <div className="flex shrink-0 items-center gap-2">
                    <label className="flex items-center gap-2 text-xs">
                      <span className={user.is_active ? "" : "text-destructive"}>{user.is_active ? "Ativo" : "Inativo"}</span>
                      <Switch checked={user.is_active} disabled={activate.isPending} onCheckedChange={async (active) => { if (active || await confirmAction(`Inativar ${user.full_name || user.email}? O usuário não conseguirá mais entrar.`)) activate.mutate({ data: { userId: user.id, active } }); }} aria-label={`Ativo: ${user.full_name || user.email || "usuário"}`} />
                    </label>
                    <Button type="button" variant="ghost" size="compactIcon" aria-label={`${isOpen ? "Recolher" : "Exibir"} aplicativos de ${user.full_name || "usuário"}`} aria-expanded={isOpen} onClick={() => toggle(user.id)}><CdeDisclosureIcon open={isOpen} screen="components/erp-app-access-admin.tsx" /></Button>
                  </div>
                )}
                details={!appKey && isOpen ? (
                  <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    {apps.map((app) => {
                      const checked = accessSet.has(`${user.id}:${app.key}`);
                      return (
                        <label key={app.key} className="flex min-w-0 items-center justify-between gap-3 text-sm">
                          <span className="min-w-0 truncate">{nameOf(app.key)}</span>
                          <span className="flex shrink-0 items-center gap-2">
                            <span className="text-xs text-muted-foreground">{checked ? "Ativo" : "Inativo"}</span>
                            <Switch
                              checked={checked}
                              disabled={update.isPending || !user.is_active}
                              onCheckedChange={(allowed) => update.mutate({ data: { userId: user.id, appKey: app.key, allowed } })}
                              aria-label={`${nameOf(app.key)} para ${user.full_name || user.email || "usuário"}`}
                            />
                          </span>
                        </label>
                      );
                    })}
                  </div>
                ) : null}
              />
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}