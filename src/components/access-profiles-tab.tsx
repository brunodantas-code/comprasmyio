import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { MenuPermissionSelector } from "@/components/menu-permission-selector";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { ALL_MENU_PERMISSION_KEYS } from "@/lib/menu-permissions";

type ProfileDefinition = {
  name: string;
  base_profile: "admin" | "padrao" | "restrito";
  access_profile_permissions?: Array<{ menu_key: string; allowed: boolean }>;
};

function symmetricDifference(first: Set<string>, second: Set<string>) {
  return new Set([...first, ...second].filter((key) => first.has(key) !== second.has(key)));
}

export function AccessProfilesTab() {
  const qc = useQueryClient();
  const [nameFilter, setNameFilter] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["custom-access-profiles"],
    queryFn: async () => {
      const [{ data: profiles, error: profilesError }, { data: access, error: accessError }, { data: permissions, error: permissionsError }] = await Promise.all([
        supabase.from("profiles").select("id, full_name, email").order("full_name"),
        supabase.from("user_access_profiles").select("user_id,is_customized,access_profile_definitions(name,base_profile,access_profile_permissions(menu_key,allowed))"),
        supabase.from("user_menu_permissions").select("user_id,menu_key,allowed"),
      ]);
      if (profilesError) throw profilesError;
      if (accessError) throw accessError;
      if (permissionsError) throw permissionsError;
      const accessByUser = new Map((access ?? []).map((item) => [item.user_id, item]));
      return (profiles ?? []).filter((profile) => accessByUser.has(profile.id)).map((profile) => {
        const accessRecord = accessByUser.get(profile.id);
        const definition = accessRecord?.access_profile_definitions as ProfileDefinition | null | undefined;
        const profilePermissions = new Set(definition?.base_profile === "admin"
          ? ALL_MENU_PERMISSION_KEYS
          : (definition?.access_profile_permissions ?? []).filter((permission) => permission.allowed).map((permission) => permission.menu_key));
        const individualPermissions = new Set((permissions ?? []).filter((permission) => permission.user_id === profile.id && permission.allowed).map((permission) => permission.menu_key));
        const selectedPermissions = accessRecord?.is_customized ? individualPermissions : profilePermissions;
        return {
          ...profile,
          profileName: definition?.name ?? "Restrito",
          isAdmin: definition?.base_profile === "admin",
          permissions: selectedPermissions,
          profilePermissions,
          differences: symmetricDifference(selectedPermissions, profilePermissions),
        };
      });
    },
  });

  const normalizedFilter = nameFilter.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
  const filteredUsers = data?.filter((user) =>
    (user.full_name || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").includes(normalizedFilter),
  );

  const updatePermissions = useMutation({
    mutationFn: async ({ userId, permissions, profilePermissions }: { userId: string; permissions: Set<string>; profilePermissions: Set<string> }) => {
      const isCustomized = symmetricDifference(permissions, profilePermissions).size > 0;
      const { error: deleteError } = await supabase.from("user_menu_permissions").delete().eq("user_id", userId);
      if (deleteError) throw deleteError;
      if (isCustomized && permissions.size > 0) {
        const { error } = await supabase.from("user_menu_permissions").insert([...permissions].map((menuKey) => ({ user_id: userId, menu_key: menuKey, allowed: true })));
        if (error) throw error;
      }
      const { error: accessError } = await supabase.from("user_access_profiles").update({ is_customized: isCustomized }).eq("user_id", userId);
      if (accessError) throw accessError;
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
        <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5" />Customizar acessos de perfis pré-definidos</CardTitle>
        <CardDescription>Adicione ou remova acessos do perfil atual de cada usuário.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            aria-label="Filtrar por nome do usuário"
            className="flex h-10 w-full rounded-md border border-input bg-background py-2 pl-9 pr-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            onChange={(event) => setNameFilter(event.target.value)}
            placeholder="Filtrar por nome do usuário"
            type="search"
            value={nameFilter}
          />
        </div>
        {isLoading ? <p className="text-sm text-muted-foreground">Carregando...</p> : null}
        {!isLoading && data?.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum usuário cadastrado.</p> : null}
        {!isLoading && data?.length !== 0 && filteredUsers?.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum usuário encontrado.</p> : null}
        {filteredUsers?.map((user) => (
          <div key={user.id} className="space-y-3 rounded-md border border-border p-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate text-sm font-medium">{user.full_name || "—"}</p>
                <Badge variant="outline">{user.profileName}</Badge>
                {user.differences.size > 0 ? <Badge className="border-myio-purple bg-myio-purple/10 text-myio-purple hover:bg-myio-purple/10">Acesso Customizado</Badge> : null}
                {user.permissions.size === 0 ? <Badge variant="outline">Configuração pendente</Badge> : null}
              </div>
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            </div>
            <MenuPermissionSelector value={user.permissions} highlightedKeys={user.differences} showAdministration={user.isAdmin} disabled={user.isAdmin || updatePermissions.isPending} onChange={(permissions) => updatePermissions.mutate({ userId: user.id, permissions, profilePermissions: user.profilePermissions })} />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}