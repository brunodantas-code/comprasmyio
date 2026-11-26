import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { CdeButton } from "@/components/cde/cde-button";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAppDisplayName } from "@/components/cde/app-order-config";
import { AccessUserRow } from "@/components/access/access-user-row";

const roles = [
  { value: "viewer", label: "Visualizador" },
  { value: "editor", label: "Editor" },
  { value: "admin", label: "Administrador" },
];

export function IndicadoresAccess() {
  const nameOf = useAppDisplayName();
  const qc = useQueryClient();
  const [user, setUser] = useState("");
  const [role, setRole] = useState("viewer");
  const query = useQuery({
    queryKey: ["indicadores-access"],
    queryFn: async () => {
      const [users, members] = await Promise.all([
        supabase.rpc("indicadores_users"),
        supabase.from("indicadores_members").select("*"),
      ]);
      if (users.error) throw users.error;
      if (members.error) throw members.error;
      return { users: users.data ?? [], members: members.data ?? [] };
    },
  });
  const save = useMutation({
    mutationFn: async (value: { id: string; role: string }) => {
      const result = await supabase.from("indicadores_members").upsert({ user_id: value.id, role: value.role }).select("user_id").single();
      if (result.error) throw result.error;
    },
    onSuccess: () => {
      setUser("");
      void qc.invalidateQueries({ queryKey: ["indicadores-access"] });
      void qc.invalidateQueries({ queryKey: ["my-erp-access"] });
      toast.success("Perfil atualizado");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Perfis · {nameOf("indicadores")}</CardTitle>
        <CardDescription>Adicione usuários e defina quem visualiza, edita ou administra.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col items-stretch gap-3 rounded-md border border-border bg-muted/50 p-3 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <SearchableSelect
              aria-label={`Usuário de ${nameOf("indicadores")}`}
              value={user}
              onChange={setUser}
              options={query.data?.users.map((item) => ({ value: item.id, label: item.full_name })) ?? []}
              placeholder="Selecione o usuário"
            />
          </div>
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger className="w-full sm:w-44" aria-label="Perfil do novo usuário"><SelectValue /></SelectTrigger>
            <SelectContent>{roles.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent>
          </Select>
          <CdeButton group="plus" screen="components/indicadores/access.tsx" aria-label="Adicionar perfil" title="Adicionar perfil" disabled={!user || save.isPending} onClick={() => save.mutate({ id: user, role })} />
        </div>
        {query.isPending ? <p className="text-sm text-muted-foreground">Carregando perfis...</p> : null}
        {query.isError ? <p className="text-sm text-destructive">Não foi possível carregar os perfis.</p> : null}
        <div className="space-y-2">
          {query.data?.members.map((member) => {
            const profile = query.data.users.find((item) => item.id === member.user_id);
            return (
              <AccessUserRow
                key={member.user_id}
                name={profile?.full_name ?? "Usuário"}
                email={profile?.email}
                controls={
                  <Select value={member.role} disabled={save.isPending} onValueChange={(value) => save.mutate({ id: member.user_id, role: value })}>
                    <SelectTrigger className="w-full max-sm:col-span-2 sm:w-[280px]" aria-label={`Perfil de ${profile?.full_name ?? "usuário"}`}><SelectValue /></SelectTrigger>
                    <SelectContent>{roles.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent>
                  </Select>
                }
              />
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
