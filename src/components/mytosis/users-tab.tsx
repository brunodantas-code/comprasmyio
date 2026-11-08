import { CdeButton } from "@/components/cde/cde-button";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { MytosisData } from "./use-mytosis";

const ROLES = [
  { value: "admin", label: "Administrador", hint: "Edita boxes, usuários e padrões" },
  { value: "editor", label: "Editor", hint: "Cria e edita objetivos e tarefas" },
  { value: "viewer", label: "Visualizador", hint: "Somente consulta" },
];

export function UsersTab({ data }: { data: MytosisData }) {
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
  const refresh = () => { queryClient.invalidateQueries({ queryKey: ["mytosis-members"] }); queryClient.invalidateQueries({ queryKey: ["mytosis"] }); };
  const upsert = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const { error } = await supabase.from("mytosis_members").upsert({ user_id: userId, role }, { onConflict: "user_id" });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Permissão salva."); setNewUser(""); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.from("mytosis_members").delete().eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Usuário removido."); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const nameOf = (id: string) => data.users.find((u) => u.id === id);
  const available = data.users.filter((u) => !members.some((m) => m.user_id === u.id));

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-normal">Usuários do Mytosis</h2>
        <p className="text-sm text-muted-foreground">Defina quem vê, quem edita e quem administra. Administradores do ERP são sempre Administradores aqui.</p>
      </div>
      {isAdmin ? (
        <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-muted/50 px-4 py-3">
          <div className="min-w-64 flex-1"><SearchableSelect value={newUser} onChange={setNewUser} options={available.map((u) => ({ value: u.id, label: u.full_name, keywords: u.email ?? "" }))} placeholder="Selecione o usuário" /></div>
          <Select value={newRole} onValueChange={setNewRole}><SelectTrigger className="w-44"><SelectValue /></SelectTrigger><SelectContent>{ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent></Select>
          <CdeButton group="plus" screen="components/mytosis/users-tab.tsx" disabled={!newUser || upsert.isPending} onClick={() => upsert.mutate({ userId: newUser, role: newRole })} aria-label="Adicionar usuário" title="Adicionar usuário"></CdeButton>
        </div>
      ) : null}
      <div className="rounded-xl border border-border bg-card">
        <Table>
          <TableHeader><TableRow><TableHead>Usuário</TableHead><TableHead>E-mail</TableHead><TableHead>Permissão</TableHead><TableHead className="w-16" /></TableRow></TableHeader>
          <TableBody>
            {members.length ? members.map((m) => (
              <TableRow key={m.user_id}>
                <TableCell>{nameOf(m.user_id)?.full_name ?? "Usuário"}</TableCell>
                <TableCell className="text-muted-foreground">{nameOf(m.user_id)?.email ?? "—"}</TableCell>
                <TableCell>{isAdmin ? (
                  <Select value={m.role} onValueChange={(role) => upsert.mutate({ userId: m.user_id, role })}><SelectTrigger className="h-8 w-44"><SelectValue /></SelectTrigger><SelectContent>{ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent></Select>
                ) : ROLES.find((r) => r.value === m.role)?.label}</TableCell>
                <TableCell>{isAdmin ? <Button variant="ghost" size="icon" className="text-primary" onClick={() => { if (window.confirm("Remover este usuário do Mytosis?")) remove.mutate(m.user_id); }} aria-label="Remover usuário" title="Remover usuário"><Trash2 className="h-4 w-4" /></Button> : null}</TableCell>
              </TableRow>
            )) : <TableRow><TableCell colSpan={4} className="py-10 text-center text-muted-foreground">Nenhum usuário cadastrado.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
      <ul className="space-y-1 text-xs text-muted-foreground">{ROLES.map((r) => <li key={r.value}>{r.label}: {r.hint}</li>)}</ul>
    </div>
  );
}
