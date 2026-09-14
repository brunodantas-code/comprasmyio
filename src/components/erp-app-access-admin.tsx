import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { getErpUsersAndAccess, setErpAppAccess } from "@/lib/erp-admin.functions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

const APPS = [
  { key: "supply", label: "myio supply" },
  { key: "cash_flow", label: "myio cash flow" },
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
            <div key={user.id} className="grid gap-3 rounded-md border border-border p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate font-semibold">{user.full_name || "Sem nome"}</p>
                  {adminSet.has(user.id) ? <Badge variant="outline">Admin do ERP</Badge> : null}
                </div>
                <p className="truncate text-xs text-muted-foreground">{user.email}</p>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:flex sm:gap-5">
                {APPS.map((app) => {
                  const checked = accessSet.has(`${user.id}:${app.key}`);
                  return (
                    <label key={app.key} className="flex items-center justify-between gap-2 text-sm sm:justify-start">
                      <Switch
                        checked={checked}
                        disabled={update.isPending}
                        onCheckedChange={(allowed) => update.mutate({ data: { userId: user.id, appKey: app.key, allowed } })}
                        aria-label={`${app.label} para ${user.full_name || user.email || "usuário"}`}
                      />
                      <span>{app.label}</span>
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