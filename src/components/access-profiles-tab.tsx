import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { MenuPermissionSelector } from "@/components/menu-permission-selector";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

export function AccessProfilesTab() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["custom-access-profiles"],
    queryFn: async () => {
      const [{ data: profiles, error: profilesError }, { data: access, error: accessError }, { data: permissions, error: permissionsError }] = await Promise.all([
        supabase.from("profiles").select("id, full_name, email").order("full_name"),
        supabase.from("user_access_profiles").select("user_id,is_customized").eq("is_customized", true),
        supabase.from("user_menu_permissions").select("user_id,menu_key,allowed"),
      ]);
      if (profilesError) throw profilesError;
      if (accessError) throw accessError;
      if (permissionsError) throw permissionsError;
      const customizedIds = new Set((access ?? []).map((item) => item.user_id));
      return (profiles ?? []).filter((profile) => customizedIds.has(profile.id)).map((profile) => ({
        ...profile,
        permissions: new Set((permissions ?? []).filter((permission) => permission.user_id === profile.id && permission.allowed).map((permission) => permission.menu_key)),
      }));
    },
  });

  const updatePermissions = useMutation({
    mutationFn: async ({ userId, permissions }: { userId: string; permissions: Set<string> }) => {
      const { error: deleteError } = await supabase.from("user_menu_permissions").delete().eq("user_id", userId);
      if (deleteError) throw deleteError;
      if (permissions.size > 0) {
        const { error } = await supabase.from("user_menu_permissions").insert([...permissions].map((menuKey) => ({ user_id: userId, menu_key: menuKey, allowed: true })));
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["custom-access-profiles"] });
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Acesso customizado atualizado");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5" />Usuários com acesso Customizado</CardTitle>
        <CardDescription>Defina individualmente todos os menus e submenus desses usuários.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? <p className="text-sm text-muted-foreground">Carregando...</p> : null}
        {!isLoading && data?.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum usuário utiliza acesso Customizado.</p> : null}
        {data?.map((user) => (
          <div key={user.id} className="space-y-3 rounded-md border border-border p-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2"><p className="truncate text-sm font-medium">{user.full_name || "—"}</p>{user.permissions.size === 0 ? <Badge variant="outline">Configuração pendente</Badge> : null}</div>
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            </div>
            <MenuPermissionSelector value={user.permissions} disabled={updatePermissions.isPending} onChange={(permissions) => updatePermissions.mutate({ userId: user.id, permissions })} />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}