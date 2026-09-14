import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

const MENU_GROUPS = [
  {
    key: "solicitacoes",
    label: "Solicitações",
    children: [
      { key: "solicitacoes_minhas", label: "Minhas Solicitações" },
      { key: "solicitacoes_novas", label: "Novas Solicitações" },
    ],
  },
  {
    key: "approvals",
    label: "Approvals",
    children: [
      { key: "approvals_pendentes", label: "Pendentes comigo" },
      { key: "approvals_meus", label: "Meus em aprovação" },
      { key: "approvals_todos", label: "Todos" },
      { key: "approvals_consolidado", label: "Consolidado por Cargo" },
    ],
  },
  { key: "armazem", label: "Armazém", children: [] },
  {
    key: "cadastro",
    label: "Cadastro",
    children: [
      { key: "cadastro_projetos", label: "Projetos" },
      { key: "cadastro_clientes", label: "Clientes" },
      { key: "cadastro_centros", label: "Centro de Custo" },
      { key: "cadastro_cargos", label: "Cargos" },
      { key: "cadastro_lembretes", label: "Lembretes" },
      { key: "cadastro_diversos", label: "Diversos" },
    ],
  },
  {
    key: "usuarios",
    label: "Usuários e logs",
    children: [
      { key: "usuarios_lista", label: "Usuários" },
      { key: "usuarios_acesso_restrito", label: "Acesso Restrito" },
      { key: "usuarios_workflow", label: "Approval Workflow" },
      { key: "usuarios_logs", label: "Logs" },
      { key: "usuarios_backup", label: "Backup" },
    ],
  },
] as const;

export function AccessProfilesTab() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["restricted-access-profiles"],
    queryFn: async () => {
      const [{ data: profiles, error: profilesError }, { data: access, error: accessError }, { data: permissions, error: permissionsError }] = await Promise.all([
        supabase.from("profiles").select("id, full_name, email").order("full_name"),
        supabase.from("user_access_profiles").select("user_id, profile").eq("profile", "restrito"),
        supabase.from("user_menu_permissions").select("user_id, menu_key, allowed"),
      ]);
      if (profilesError) throw profilesError;
      if (accessError) throw accessError;
      if (permissionsError) throw permissionsError;
      const restrictedIds = new Set((access ?? []).map((item) => item.user_id));
      return (profiles ?? []).filter((profile) => restrictedIds.has(profile.id)).map((profile) => ({
        ...profile,
        permissions: new Set((permissions ?? []).filter((permission) => permission.user_id === profile.id && permission.allowed).map((permission) => permission.menu_key)),
      }));
    },
  });

  const updatePermission = useMutation({
    mutationFn: async ({ userId, menuKey, allowed }: { userId: string; menuKey: string; allowed: boolean }) => {
      const { error } = await supabase.from("user_menu_permissions").upsert(
        { user_id: userId, menu_key: menuKey, allowed },
        { onConflict: "user_id,menu_key" },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["restricted-access-profiles"] });
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Acesso atualizado");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const updateGroup = useMutation({
    mutationFn: async ({ userId, keys, allowed }: { userId: string; keys: readonly string[]; allowed: boolean }) => {
      const { error } = await supabase.from("user_menu_permissions").upsert(
        keys.map((menuKey) => ({ user_id: userId, menu_key: menuKey, allowed })),
        { onConflict: "user_id,menu_key" },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["restricted-access-profiles"] });
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Acesso atualizado");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5" />Acesso Restrito</CardTitle>
        <CardDescription>Defina individualmente os menus disponíveis para usuários com perfil Restrito.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? <p className="text-sm text-muted-foreground">Carregando...</p> : null}
        {!isLoading && data?.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum usuário com perfil Restrito.</p> : null}
        {data?.map((user) => (
          <div key={user.id} className="grid gap-3 rounded-lg border border-border p-3 md:grid-cols-[minmax(180px,1fr)_2fr] md:items-center">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate text-sm font-medium">{user.full_name || "—"}</p>
                {user.permissions.size === 0 ? <Badge variant="outline">Configuração pendente</Badge> : null}
              </div>
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {MENU_GROUPS.map((menu) => (
                <div key={menu.key} className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <Checkbox
                      checked={user.permissions.has(menu.key)}
                      disabled={updatePermission.isPending || updateGroup.isPending}
                      onCheckedChange={(checked) => updateGroup.mutate({
                        userId: user.id,
                        keys: [menu.key, ...menu.children.map((child) => child.key)],
                        allowed: checked === true,
                      })}
                    />
                    {menu.label}
                  </label>
                  {menu.children.length ? (
                    <div className="grid gap-2 border-l border-border pl-4">
                      {menu.children.map((child) => (
                        <label key={child.key} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Checkbox
                            checked={user.permissions.has(child.key)}
                            disabled={updatePermission.isPending || updateGroup.isPending}
                            onCheckedChange={(checked) => {
                              const allowed = checked === true;
                              if (allowed && !user.permissions.has(menu.key)) {
                                updateGroup.mutate({ userId: user.id, keys: [menu.key, child.key], allowed: true });
                                return;
                              }
                              updatePermission.mutate({ userId: user.id, menuKey: child.key, allowed });
                            }}
                          />
                          {child.label}
                        </label>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}