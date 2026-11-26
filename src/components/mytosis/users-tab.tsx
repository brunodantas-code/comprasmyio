import { confirmAction } from "@/components/confirm-dialog";
import { CdeButton } from "@/components/cde/cde-button";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AccessUserRow } from "@/components/access/access-user-row";
import type { MytosisData } from "./use-mytosis";

const ROLES = [
  { value: "admin", label: "Administrador", hint: "Edita boxes, usuários e padrões" },
  { value: "editor", label: "Editor", hint: "Cria e edita objetivos e tarefas" },
  { value: "viewer", label: "Visualizador", hint: "Somente consulta" },
];

export function UsersTab({ data }: { data: Pick<MytosisData, "users" | "role"> }) {
  const queryClient = useQueryClient();
  const isAdmin = data.role === "admin";
  const [newUser, setNewUser] = useState("");
  const [newRole, setNewRole] = useState("editor");
  const { data: members = [] } = useQuery({
    queryKey: ["mytosis-members"],
    queryFn: async () => {
      const { data: rows, error } = await supabase.from("mytosis_members").select("user_id, role");
      if (error) throw error;
      return rows;
    },
  });
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["mytosis-members"] });
    queryClient.invalidateQueries({ queryKey: ["mytosis"] });
  };
  const upsert = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const { error } = await supabase.from("mytosis_members").upsert({ user_id: userId, role }, { onConflict: "user_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Permissão salva.");
      setNewUser("");
      refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const remove = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.from("mytosis_members").delete().eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Usuário removido.");
      refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const nameOf = (id: string) => data.users.find((user) => user.id === id);
  const available = data.users.filter((user) => !members.some((member) => member.user_id === user.id));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Usuários do Mytosis</CardTitle>
        <CardDescription>Defina quem vê, quem edita e quem administra. Administradores do ERP são sempre Administradores aqui.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isAdmin ? (
          <div className="flex flex-col items-stretch gap-3 rounded-md border border-border bg-muted/50 p-3 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1"><SearchableSelect value={newUser} onChange={setNewUser} options={available.map((user) => ({ value: user.id, label: user.full_name, keywords: user.email ?? "" }))} placeholder="Selecione o usuário" /></div>
            <Select value={newRole} onValueChange={setNewRole}>
              <SelectTrigger className="w-full sm:w-44" aria-label="Permissão do novo usuário"><SelectValue /></SelectTrigger>
              <SelectContent>{ROLES.map((role) => <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>)}</SelectContent>
            </Select>
            <CdeButton group="plus" screen="components/mytosis/users-tab.tsx" disabled={!newUser || upsert.isPending} onClick={() => upsert.mutate({ userId: newUser, role: newRole })} aria-label="Adicionar usuário" title="Adicionar usuário" />
          </div>
        ) : null}
        <div className="space-y-2">
          {members.length ? members.map((member) => {
            const profile = nameOf(member.user_id);
            return (
              <AccessUserRow
                key={member.user_id}
                name={profile?.full_name ?? "Usuário"}
                email={profile?.email}
                controls={
                  <div className="flex min-w-0 items-center gap-2 max-sm:col-span-2 sm:w-[280px]">
                    {isAdmin ? (
                      <Select value={member.role} disabled={upsert.isPending} onValueChange={(role) => upsert.mutate({ userId: member.user_id, role })}>
                        <SelectTrigger className="min-w-0 flex-1" aria-label={`Permissão de ${profile?.full_name ?? "usuário"}`}><SelectValue /></SelectTrigger>
                        <SelectContent>{ROLES.map((role) => <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>)}</SelectContent>
                      </Select>
                    ) : <span className="text-sm">{ROLES.find((role) => role.value === member.role)?.label}</span>}
                    {isAdmin ? <Button variant="ghost" size="compactIcon" className="shrink-0 text-primary" onClick={async () => { if (await confirmAction("Remover este usuário do Mytosis?")) remove.mutate(member.user_id); }} aria-label={`Remover ${profile?.full_name ?? "usuário"}`} title="Remover usuário"><Trash2 className="h-4 w-4" /></Button> : null}
                  </div>
                }
              />
            );
          }) : <p className="py-6 text-center text-sm text-muted-foreground">Nenhum usuário cadastrado.</p>}
        </div>
        <ul className="space-y-1 text-xs text-muted-foreground">{ROLES.map((role) => <li key={role.value}>{role.label}: {role.hint}</li>)}</ul>
      </CardContent>
    </Card>
  );
}
