import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { getErpUsersAndAccess, setErpAppAccess } from "@/lib/erp-admin.functions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

const APPS = [
  { key: "supply", label: "Supply" },
  { key: "cash_flow", label: "Cash Flow" },
  { key: "crm", label: "CRM" },
  { key: "legal", label: "Legal" },
  { key: "rh", label: "RH" },
  { key: "site_survey", label: "Site Survey" },
  { key: "chamados", label: "OpDesk" },
  { key: "development", label: "Code" },
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

  const accessSet = new Set((data?.accesses ?? []).map((access) => `${access.user_id}:${access.app_key}`));
  const adminSet = new Set(data?.adminIds ?? []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5" />Usuários e aplicativos</CardTitle>
        <CardDescription>Libere os aplicativos do ERP sem alterar cargos ou perfis internos de cada app.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? <p className="text-sm text-muted-foreground">Carregando usuários...</p> : null}
        <div className="space-y-2">
          {data?.users.map((user) => (
            <div key={user.id} className="grid gap-4 rounded-md border border-border p-3 lg:grid-cols-[minmax(12rem,16rem)_minmax(0,1fr)] lg:items-center">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="break-words font-semibold">{user.full_name || "Sem nome"}</p>
                  {adminSet.has(user.id) ? <Badge variant="outline">Admin do ERP</Badge> : null}
                </div>
                <p className="break-all text-xs text-muted-foreground">{user.email}</p>
              </div>
              <div className="grid min-w-0 grid-cols-2 gap-x-4 gap-y-3 sm:grid-flow-col sm:grid-rows-2 sm:grid-cols-4 sm:gap-x-4">
                {APPS.map((app) => {
                  const checked = accessSet.has(`${user.id}:${app.key}`);
                  return (
                    <label key={app.key} className="grid min-w-0 grid-cols-[2.75rem_minmax(0,1fr)] items-center gap-2 text-sm">
                      <Switch
                        checked={checked}
                        disabled={update.isPending}
                        onCheckedChange={(allowed) => update.mutate({ data: { userId: user.id, appKey: app.key, allowed } })}
                        aria-label={`${app.label} para ${user.full_name || user.email || "usuário"}`}
                      />
                      <span className="min-w-0 whitespace-nowrap">{app.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}