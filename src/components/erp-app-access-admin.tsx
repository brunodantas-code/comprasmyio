import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ChevronDown, ChevronRight, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { getErpUsersAndAccess, setErpAppAccess, setErpUserActive } from "@/lib/erp-admin.functions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

const APPS = [
  { key: "supply", label: "Supply" },
  { key: "cash_flow", label: "Cash Flow" },
  { key: "crm", label: "CRM" },
  { key: "legal", label: "Legal" },
  { key: "rh", label: "RH" },
  { key: "site_survey", label: "Site Survey" },
  { key: "chamados", label: "OpDesk" },
  { key: "development", label: "Code" },
  { key: "mytosis", label: "Mytosis" },
  { key: "cde", label: "CDE" },
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

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "inactive">("all");
  const [appFilter, setAppFilter] = useState<string>("all");
  const [open, setOpen] = useState<Set<string>>(new Set());
  const toggle = (id: string) => setOpen((cur) => { const n = new Set(cur); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const saveActive = useServerFn(setErpUserActive);
  const activate = useMutation({
    mutationFn: (v: { data: { userId: string; active: boolean } }) => saveActive(v),
    onSuccess: (_r, v: { data: { userId: string; active: boolean } }) => {
      queryClient.invalidateQueries({ queryKey: ["erp-users-and-access"] });
      toast.success(v.data.active ? "Usuário ativado" : "Usuário inativado: não consegue mais entrar");
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const users = [...(data?.users ?? [])].sort((a, b) => Number(b.is_active) - Number(a.is_active));
  const norm = (v: string) => v.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const accessSet = new Set((data?.accesses ?? []).map((access) => `${access.user_id}:${access.app_key}`));
  const filtered = users.filter((u) => (status === "all" || (status === "active") === u.is_active)
    && (appFilter === "all" || accessSet.has(`${u.id}:${appFilter}`))
    && (!query.trim() || norm(`${u.full_name ?? ""} ${u.email ?? ""}`).includes(norm(query.trim()))));
  const adminSet = new Set(data?.adminIds ?? []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5" />Usuários e aplicativos</CardTitle>
        <CardDescription>Libere os aplicativos do ERP sem alterar cargos ou perfis internos de cada app.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? <p className="text-sm text-muted-foreground">Carregando usuários...</p> : null}
        <div className="mb-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_10rem_12rem]">
          <div className="relative min-w-0">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nome ou e-mail" className="pl-9" aria-label="Buscar usuário" />
          </div>
          <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
            <SelectTrigger aria-label="Filtrar situação"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">Todos</SelectItem><SelectItem value="active">Ativos</SelectItem><SelectItem value="inactive">Inativos</SelectItem></SelectContent>
          </Select>
          <Select value={appFilter} onValueChange={setAppFilter}>
            <SelectTrigger aria-label="Filtrar por aplicativo"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">Todos os apps</SelectItem>{APPS.map((a) => <SelectItem key={a.key} value={a.key}>Com {a.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        {!isLoading ? <p className="mb-2 text-xs text-muted-foreground">{filtered.length} de {users.length} usuários</p> : null}
        <div className="divide-y divide-border">
          {filtered.map((user) => {
            const isOpen = open.has(user.id);
            return (
            <div key={user.id} className={user.is_active ? "" : "opacity-60"}>
              <div className="flex flex-wrap items-center gap-2 py-2">
                <button type="button" onClick={() => toggle(user.id)} aria-expanded={isOpen} className="flex min-w-0 items-center gap-2 text-left">
                  {isOpen ? <ChevronDown className="h-5 w-5 shrink-0 text-primary" /> : <ChevronRight className="h-5 w-5 shrink-0 text-primary" />}
                  <span className="break-words font-semibold">{user.full_name || "Sem nome"}</span>
                  <span className="break-all text-xs text-muted-foreground">{user.email}</span>
                </button>
                {adminSet.has(user.id) ? <Badge variant="outline">Admin do ERP</Badge> : null}
                <label className="ml-auto flex items-center gap-2 text-xs">
                  <Switch checked={user.is_active} disabled={activate.isPending} onCheckedChange={(active) => { if (active || window.confirm(`Inativar ${user.full_name || user.email}? O usuário não conseguirá mais entrar.`)) activate.mutate({ data: { userId: user.id, active } }); }} aria-label={`Ativo: ${user.full_name || user.email || "usuário"}`} />
                  <span className={user.is_active ? "" : "text-destructive"}>{user.is_active ? "Ativo" : "Inativo"}</span>
                </label>
              </div>
              {isOpen ? <div className="grid min-w-0 grid-cols-2 gap-x-4 gap-y-3 rounded-md border border-border p-3 sm:grid-flow-col sm:grid-rows-2 sm:grid-cols-5">
                {APPS.map((app) => {
                  const checked = accessSet.has(`${user.id}:${app.key}`);
                  return (
                    <label key={app.key} className="grid min-w-0 grid-cols-[2.75rem_minmax(0,1fr)] items-center gap-2 text-sm">
                      <Switch
                        checked={checked}
                        disabled={update.isPending || !user.is_active}
                        onCheckedChange={(allowed) => update.mutate({ data: { userId: user.id, appKey: app.key, allowed } })}
                        aria-label={`${app.label} para ${user.full_name || user.email || "usuário"}`}
                      />
                      <span className="min-w-0 whitespace-nowrap">{app.label}</span>
                    </label>
                  );
                })}
              </div> : null}
            </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}