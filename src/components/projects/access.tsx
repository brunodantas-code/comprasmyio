import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AccessUserRow } from "@/components/access/access-user-row";

export function ProjectsAccess() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["pm-access"],
    queryFn: async () => {
      const [users, roles, access] = await Promise.all([
        supabase.from("profiles").select("id,full_name,email").eq("is_active", true).is("deleted_at", null).order("full_name"),
        supabase.from("pm_app_roles").select("*"),
        supabase.from("user_app_access").select("user_id").eq("app_key", "projects"),
      ]);
      for (const result of [users, roles, access]) if (result.error) throw result.error;
      const ids = new Set(access.data?.map((item) => item.user_id));
      return { users: users.data?.filter((user) => ids.has(user.id)) ?? [], roles: roles.data ?? [] };
    },
  });
  const mutation = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: string }) => {
      const result = await supabase.from("pm_app_roles").upsert({ user_id: id, role });
      if (result.error) throw result.error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pm-access"] });
      qc.invalidateQueries({ queryKey: ["pm-workspace"] });
      toast.success("Perfil atualizado");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Perfis · Projects</CardTitle>
        <CardDescription>Defina o perfil dos usuários com acesso ao Projects.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {query.isPending ? <p className="text-sm text-muted-foreground">Carregando perfis...</p> : null}
        {query.isError ? <p className="text-sm text-destructive">Não foi possível carregar os perfis.</p> : null}
        {query.data?.users.map((user) => (
          <AccessUserRow
            key={user.id}
            name={user.full_name || "Sem nome"}
            email={user.email}
            controls={
              <Select value={query.data?.roles.find((role) => role.user_id === user.id)?.role ?? "member"} disabled={mutation.isPending} onValueChange={(role) => mutation.mutate({ id: user.id, role })}>
                <SelectTrigger className="w-full max-sm:col-span-2 sm:w-[280px]" aria-label={`Perfil de ${user.full_name}`}><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="manager">Gestor</SelectItem><SelectItem value="member">Participante</SelectItem></SelectContent>
              </Select>
            }
          />
        ))}
      </CardContent>
    </Card>
  );
}
