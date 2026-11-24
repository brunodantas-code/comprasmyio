import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { CdeButton } from "@/components/cde/cde-button";
import { useState } from "react";
import { Choice } from "./editors";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useAppDisplayName } from "@/components/cde/app-order-config";
import {
  Table,
  TableHeader,
  TableHead,
  TableRow,
  TableBody,
  TableCell,
} from "@/components/ui/table";
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
    mutationFn: async (v: { id: string; role: string }) => {
      const r = await supabase
        .from("indicadores_members")
        .upsert({ user_id: v.id, role: v.role })
        .select("user_id")
        .single();
      if (r.error) throw r.error;
    },
    onSuccess: () => {
      setUser("");
      void qc.invalidateQueries({ queryKey: ["indicadores-access"] });
      void qc.invalidateQueries({ queryKey: ["my-erp-access"] });
      toast.success("Perfil atualizado");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  if (query.isPending) return <p>Carregando...</p>;
  if (query.isError)
    return <p className="text-destructive">Não foi possível carregar os perfis.</p>;
  return (
    <section className="space-y-4">
      <h2 className="text-lg">Perfis · {nameOf("indicadores")}</h2>
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-48 flex-1">
          <SearchableSelect
            aria-label={`Usuário de ${nameOf("indicadores")}`}
            value={user}
            onChange={setUser}
            options={query.data.users.map((u) => ({ value: u.id, label: u.full_name }))}
          />
        </div>
        <div className="w-44">
          <Choice label="Perfil" value={role} onChange={setRole} options={roles} />
        </div>
        <CdeButton
          group="plus"
          screen="components/indicadores/access.tsx"
          aria-label="Adicionar perfil"
          title="Adicionar perfil"
          disabled={!user || save.isPending}
          onClick={() => save.mutate({ id: user, role })}
        />
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Usuário</TableHead>
            <TableHead>Perfil</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {query.data.members.map((m) => (
            <TableRow key={m.user_id}>
              <TableCell>
                {query.data.users.find((u) => u.id === m.user_id)?.full_name ?? "Usuário"}
              </TableCell>
              <TableCell>
                <Choice
                  label="Perfil"
                  value={m.role}
                  onChange={(r) => save.mutate({ id: m.user_id, role: r })}
                  options={roles}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </section>
  );
}
