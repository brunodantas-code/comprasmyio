import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { MenuPermissionSelector } from "@/components/menu-permission-selector";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { ALL_MENU_PERMISSION_KEYS } from "@/lib/menu-permissions";
import { useRequestTypes } from "@/components/request-types-tab";

type ProfileDefinition = {
  name: string;
  base_profile: "admin" | "padrao" | "restrito";
  access_profile_permissions?: Array<{ menu_key: string; allowed: boolean }>;
  access_profile_request_types?: Array<{ request_type_code: string }>;
};

function symmetricDifference(first: Set<string>, second: Set<string>) {
  return new Set([...first, ...second].filter((key) => first.has(key) !== second.has(key)));
}

export function AccessProfilesTab() {
  const qc = useQueryClient();
  const [nameFilter, setNameFilter] = useState("");
  const { data: requestTypes = [] } = useRequestTypes();
  const activeRequestTypeCodes = requestTypes.filter((type) => type.active).map((type) => type.code);
  const { data, isLoading } = useQuery({
    queryKey: ["custom-access-profiles", activeRequestTypeCodes],
    queryFn: async () => {
      const [{ data: profiles, error: profilesError }, { data: access, error: accessError }, { data: permissions, error: permissionsError }, { data: individualTypes, error: individualTypesError }] = await Promise.all([
        supabase.from("profiles").select("id, full_name, email").order("full_name"),
        supabase.from("user_access_profiles").select("user_id,is_customized,access_profile_definitions(name,base_profile,access_profile_permissions(menu_key,allowed),access_profile_request_types(request_type_code))"),
        supabase.from("user_menu_permissions").select("user_id,menu_key,allowed"),
        supabase.from("user_request_type_permissions").select("user_id,request_type_code"),
      ]);
      if (profilesError) throw profilesError;
      if (accessError) throw accessError;
      if (permissionsError) throw permissionsError;
      if (individualTypesError) throw individualTypesError;
      const accessByUser = new Map((access ?? []).map((item) => [item.user_id, item]));
      return (profiles ?? []).filter((profile) => accessByUser.has(profile.id)).map((profile) => {
        const accessRecord = accessByUser.get(profile.id);
        const definition = accessRecord?.access_profile_definitions as ProfileDefinition | null | undefined;
        const profilePermissions = new Set(definition?.base_profile === "admin"
          ? ALL_MENU_PERMISSION_KEYS
          : (definition?.access_profile_permissions ?? []).filter((permission) => permission.allowed).map((permission) => permission.menu_key));
        const individualPermissions = new Set((permissions ?? []).filter((permission) => permission.user_id === profile.id && permission.allowed).map((permission) => permission.menu_key));
        const profileRequestTypes = new Set(definition?.base_profile === "admin"
          ? activeRequestTypeCodes
          : definition?.access_profile_request_types?.map((permission) => permission.request_type_code) ?? []);
        const individualRequestTypes = new Set((individualTypes ?? []).filter((permission) => permission.user_id === profile.id).map((permission) => permission.request_type_code));
        const selectedPermissions = accessRecord?.is_customized ? individualPermissions : profilePermissions;
        const selectedRequestTypes = accessRecord?.is_customized ? individualRequestTypes : profileRequestTypes;
        return {
          ...profile,
          profileName: definition?.name ?? "Restrito",
          isAdmin: definition?.base_profile === "admin",
          permissions: selectedPermissions,
          profilePermissions,
          requestTypes: selectedRequestTypes,
          profileRequestTypes,
          differences: symmetricDifference(selectedPermissions, profilePermissions),
          requestTypeDifferences: symmetricDifference(selectedRequestTypes, profileRequestTypes),
        };
      });
    },
  });

  const normalizedFilter = nameFilter.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
  const filteredUsers = data?.filter((user) =>
    (user.full_name || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").includes(normalizedFilter),
  );

  const updatePermissions = useMutation({
    mutationFn: async ({ userId, permissions, profilePermissions, requestTypes, profileRequestTypes }: { userId: string; permissions: Set<string>; profilePermissions: Set<string>; requestTypes: Set<string>; profileRequestTypes: Set<string> }) => {
      const isCustomized = symmetricDifference(permissions, profilePermissions).size > 0 || symmetricDifference(requestTypes, profileRequestTypes).size > 0;
      const [{ error: deleteError }, { error: deleteTypesError }] = await Promise.all([
        supabase.from("user_menu_permissions").delete().eq("user_id", userId),
        supabase.from("user_request_type_permissions").delete().eq("user_id", userId),
      ]);
      if (deleteError) throw deleteError;
      if (deleteTypesError) throw deleteTypesError;
      if (isCustomized && permissions.size > 0) {
        const { error } = await supabase.from("user_menu_permissions").insert([...permissions].map((menuKey) => ({ user_id: userId, menu_key: menuKey, allowed: true })));
        if (error) throw error;
      }
      if (isCustomized && requestTypes.size > 0) {
        const { error } = await supabase.from("user_request_type_permissions").insert([...requestTypes].map((requestTypeCode) => ({ user_id: userId, request_type_code: requestTypeCode })));
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
          <Input
            aria-label="Filtrar por nome do usuário"
            className="pl-9"
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
                {user.differences.size > 0 || user.requestTypeDifferences.size > 0 ? <Badge className="border-primary bg-primary/15 text-foreground hover:bg-primary/20">Acesso Customizado</Badge> : null}
                {user.permissions.size === 0 ? <Badge variant="outline">Configuração pendente</Badge> : null}
              </div>
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            </div>
            <MenuPermissionSelector
              value={user.permissions}
              highlightedKeys={user.differences}
              requestTypes={requestTypes.filter((type) => type.active)}
              requestTypeValue={user.requestTypes}
              highlightedRequestTypes={user.requestTypeDifferences}
              showAdministration={user.isAdmin}
              disabled={user.isAdmin || updatePermissions.isPending}
              onChange={(permissions) => updatePermissions.mutate({ userId: user.id, permissions, profilePermissions: user.profilePermissions, requestTypes: permissions.has("solicitacoes_novas") ? user.requestTypes : new Set(), profileRequestTypes: user.profileRequestTypes })}
              onRequestTypeChange={(nextRequestTypes) => updatePermissions.mutate({ userId: user.id, permissions: user.permissions, profilePermissions: user.profilePermissions, requestTypes: nextRequestTypes, profileRequestTypes: user.profileRequestTypes })}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}