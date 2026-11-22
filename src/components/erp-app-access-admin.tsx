import { CdeDisclosureIcon } from "@/components/cde/cde-button";
import { Button } from "@/components/ui/button";
import { confirmAction } from "@/components/confirm-dialog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ChevronDown, ChevronRight, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useTableFilters } from "@/components/use-table-filters";
import { toast } from "sonner";
import { getErpUsersAndAccess, setErpAppAccess, setErpUserActive } from "@/lib/erp-admin.functions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

const APPS = [
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

export function ErpAppAccessAdmin() {
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
  const users = [...(data?.users ?? [])].sort((a, b) => Number(b.is_active) - Number(a.is_active));
  const accessSet = new Set((data?.accesses ?? []).map((access) => `${access.user_id}:${access.app_key}`));
  const userFilters = useTableFilters(users, [
    { key: "name", label: "Nome", value: (u) => u.full_name ?? "" },
    { key: "email", label: "E-mail", value: (u) => u.email ?? "" },
    { key: "status", label: "Situação", value: (u) => (u.is_active ? "Ativo" : "Inativo") },
    ...APPS.map((app) => ({ key: `app_${app.key}`, label: app.label, value: (u: (typeof users)[number]) => (accessSet.has(`${u.id}:${app.key}`) ? "Com acesso" : "Sem acesso") })),
  ]);
  const filtered = userFilters.filtered;
  const adminSet = new Set(data?.adminIds ?? []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5" />Usuários e aplicativos{userFilters.menu}</CardTitle>
        <CardDescription>Libere os aplicativos do ERP sem alterar cargos ou perfis internos de cada app.</CardDescription>
      </CardHeader>
      <CardContent>
        {userFilters.summary}
        {isLoading ? <p className="text-sm text-muted-foreground">Carregando usuários...</p> : null}
        {!isLoading ? <p className="mb-2 text-xs text-muted-foreground">{filtered.length} de {users.length} usuários</p> : null}
        <div className="divide-y divide-border">
          {filtered.map((user) => {
            const isOpen = open.has(user.id);
            return (
            <div key={user.id} className={user.is_active ? "" : "opacity-60"}>
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 py-2 sm:flex">
                <button type="button" onClick={() => toggle(user.id)} className="flex min-w-0 flex-1 flex-wrap items-center gap-2 text-left">
                  <span className="break-words font-semibold">{user.full_name || "Sem nome"}</span>
                  <span className="break-all text-xs text-muted-foreground">{user.email}</span>
                </button>
                {adminSet.has(user.id) ? <Badge variant="outline" className="col-start-1 row-start-2 w-fit">Admin do ERP</Badge> : null}
                <label className="col-start-1 flex items-center gap-2 text-xs sm:ml-auto">
                  <Switch checked={user.is_active} disabled={activate.isPending} onCheckedChange={async (active) => { if (active || await confirmAction(`Inativar ${user.full_name || user.email}? O usuário não conseguirá mais entrar.`)) activate.mutate({ data: { userId: user.id, active } }); }} aria-label={`Ativo: ${user.full_name || user.email || "usuário"}`} />
                  <span className={user.is_active ? "" : "text-destructive"}>{user.is_active ? "Ativo" : "Inativo"}</span>
                </label>
                <Button type="button" variant="ghost" size="compactIcon" className="col-start-2 row-start-1 shrink-0" aria-label={`${isOpen ? "Recolher" : "Exibir"} aplicativos de ${user.full_name || "usuário"}`} aria-expanded={isOpen} onClick={() => toggle(user.id)}><CdeDisclosureIcon open={isOpen} screen="components/erp-app-access-admin.tsx" /></Button>
              </div>
              {isOpen ? <div className="grid min-w-0 grid-cols-2 gap-x-4 gap-y-3 rounded-md border border-border p-3 sm:grid-cols-4 lg:grid-cols-6">
                {APPS.map((app) => {
                  const checked = accessSet.has(`${user.id}:${app.key}`);
                  return (
                    <label key={app.key} className="grid min-w-0 grid-cols-[2.75rem_minmax(0,1fr)] items-center gap-2 text-sm">
                      <Switch
                        checked={checked}
                        disabled={update.isPending || !user.is_active}
                        onCheckedChange={(allowed) => update.mutate({ data: { userId: user.id, appKey: app.key, allowed } })}
                        aria-label={`${app.label} para ${user.full_name || user.email || "usuário"}`}
                      />
                      <span className="min-w-0 whitespace-nowrap">{app.label}</span>
                    </label>
                  );
                })}
              </div> : null}
            </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}