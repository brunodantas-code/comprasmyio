import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";
import { decideUserDeletion, requestUserDeletion, setUserAccessProfile, setUserAdditionalJobTitles } from "@/lib/user-admin.functions";
import { useJobTitles } from "@/components/job-titles-tab";
import { useAccessProfileDefinitions } from "@/components/access-profile-definitions-tab";
import { useTableFilters } from "@/components/use-table-filters";
import { AccessUserRow } from "@/components/access/access-user-row";
import { AccessStatusTabs, putInactiveLast, type AccessStatusFilter } from "@/components/access/access-status-tabs";
import { CdeDisclosureIcon } from "@/components/cde/cde-button";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel } from "@/components/ui/alert-dialog";

function AdditionalJobTitlesSelect({ titles, value, onChange, disabled = false }: {
  titles: Array<{ id: string; name: string }>;
  value: string[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = new Set(value);
  const label = value.length === 0 ? "Nenhum" : value.length === 1 ? titles.find((title) => title.id === value[0])?.name ?? "1 cargo" : `${value.length} cargos`;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          className="h-8 w-full min-w-0 justify-start truncate border border-input !bg-background px-2 text-xs font-normal !text-foreground shadow-sm hover:!bg-muted hover:!text-foreground"
          disabled={disabled}
        >
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-0">
        <Command>
          <CommandInput placeholder="Buscar cargo" />
          <CommandList>
            <CommandEmpty>Nenhum cargo encontrado.</CommandEmpty>
            <CommandGroup>
              {titles.map((title) => {
                const checked = selected.has(title.id);
                return (
                  <CommandItem
                    key={title.id}
                    value={title.name}
                    onSelect={() => onChange(checked ? value.filter((id) => id !== title.id) : [...value, title.id])}
                  >
                    <Checkbox checked={checked} aria-label={`Selecionar ${title.name}`} />
                    <span>{title.name}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export function UsersAdmin() {
  const qc = useQueryClient();
  const { data: currentUser } = useCurrentUser();
  const setAccessProfileFn = useServerFn(setUserAccessProfile);
  const setAdditionalJobTitlesFn = useServerFn(setUserAdditionalJobTitles);
  const requestDeletionFn = useServerFn(requestUserDeletion);
  const decideDeletionFn = useServerFn(decideUserDeletion);
  const { data, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const [{ data: profiles, error: pe }, { data: accessProfiles, error: ae }, { data: menuPermissions, error: me }, { data: titles, error: te }, { data: additionalTitleLinks, error: oe }] = await Promise.all([
        supabase.from("profiles").select("*").is("deleted_at", null).order("created_at", { ascending: false }),
        supabase.from("user_access_profiles").select("user_id, profile, profile_definition_id, is_customized, access_profile_definitions(name,base_profile)"),
        supabase.from("user_menu_permissions").select("user_id, allowed").eq("allowed", true),
        supabase.from("job_titles").select("id,name").eq("active", true).order("name"),
        supabase.from("user_additional_job_titles").select("user_id,job_title_id,job_titles(id,name,active)"),
      ]);
      if (pe) throw pe;
      if (ae) throw ae;
      if (me) throw me;
      if (te) throw te;
      if (oe) throw oe;
      const titleById = new Map((titles ?? []).map((title) => [title.id, title.name]));
      const accessByUser = new Map((accessProfiles ?? []).map((item) => [item.user_id, item]));
      const configuredUsers = new Set((menuPermissions ?? []).map((item) => item.user_id));
      const additionalByUser = new Map<string, Array<{ id: string; name: string; active: boolean }>>();
      for (const item of additionalTitleLinks ?? []) {
        const title = item.job_titles as { id: string; name: string; active: boolean } | null;
        if (!title) continue;
        const current = additionalByUser.get(item.user_id) ?? [];
        current.push(title);
        additionalByUser.set(item.user_id, current);
      }
      return (profiles ?? []).map((p) => ({
        ...p,
        jobTitleId: p.job_title_id,
        jobTitleName: p.job_title_id ? titleById.get(p.job_title_id) ?? null : null,
        accessProfile: accessByUser.get(p.id)?.is_customized ? "customizado" : accessByUser.get(p.id)?.profile_definition_id ?? "restrito",
        accessProfileBase: accessByUser.get(p.id)?.profile ?? "restrito",
        accessProfileName: accessByUser.get(p.id)?.is_customized ? "Customizado" : (accessByUser.get(p.id)?.access_profile_definitions as { name?: string } | null)?.name ?? "Restrito",
        hasConfiguredAccess: configuredUsers.has(p.id),
        additionalJobTitles: additionalByUser.get(p.id) ?? [],
      }));
    },
  });

  const setJobTitle = useMutation({
    mutationFn: async ({ userId, jobTitleId }: { userId: string; jobTitleId: string | null }) => {
      if (jobTitleId) {
        const { error: cleanupError } = await supabase.from("user_additional_job_titles").delete().eq("user_id", userId).eq("job_title_id", jobTitleId);
        if (cleanupError) throw cleanupError;
      }
      const { error } = await supabase.from("profiles").update({ job_title_id: jobTitleId }).eq("id", userId);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Cargo atualizado"); qc.invalidateQueries({ queryKey: ["admin-users"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const setAccessProfile = useMutation({
    mutationFn: async ({ userId, profile }: { userId: string; profile: string }) => {
      await setAccessProfileFn({ data: { userId, profile } });
    },
    onSuccess: () => {
      toast.success("Perfil de acesso atualizado");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      qc.invalidateQueries({ queryKey: ["custom-access-profiles"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const setAdditionalJobTitles = useMutation({
    mutationFn: async ({ userId, jobTitleIds }: { userId: string; jobTitleIds: string[] }) => {
      await setAdditionalJobTitlesFn({ data: { userId, jobTitleIds } });
    },
    onSuccess: () => {
      toast.success("Cargos adicionais atualizados");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      qc.invalidateQueries({ queryKey: ["current-user"] });
      qc.invalidateQueries({ queryKey: ["pending-actions"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const { data: deletionRequests } = useQuery({
    queryKey: ["user-deletion-requests"],
    queryFn: async () => {
      const { data: requests, error } = await supabase
        .from("user_deletion_requests")
        .select("id, target_user_id, requested_by, decided_by, status, requested_at, decided_at")
        .order("requested_at", { ascending: false });
      if (error) throw error;
      return requests ?? [];
    },
  });

  const requestDeletion = useMutation({
    mutationFn: async (userId: string) => requestDeletionFn({ data: { userId } }),
    onSuccess: () => {
      toast.success("Exclusão enviada para aprovação de outro Admin");
      qc.invalidateQueries({ queryKey: ["user-deletion-requests"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const decideDeletion = useMutation({
    mutationFn: async ({ requestId, approve }: { requestId: string; approve: boolean }) => decideDeletionFn({ data: { requestId, approve } }),
    onSuccess: (_, variables) => {
      toast.success(variables.approve ? "Exclusão aprovada" : "Exclusão rejeitada");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      qc.invalidateQueries({ queryKey: ["user-deletion-requests"] });
      qc.invalidateQueries({ queryKey: ["profiles-list"] });
      qc.invalidateQueries({ queryKey: ["profiles-map"] });
      qc.invalidateQueries({ queryKey: ["pending-actions"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const { data: jobTitles } = useJobTitles();
  const { data: accessProfileDefinitions = [] } = useAccessProfileDefinitions();

  const { data: roleHierarchy } = useQuery({
    queryKey: ["role-hierarchy"],
    queryFn: async () => {
      const { data, error } = await supabase.from("job_title_hierarchy").select("job_title_id, approver_job_title_id");
      if (error) throw error;
      const map = new Map<string, string | null>();
      (data ?? []).forEach((r) => map.set(r.job_title_id, r.approver_job_title_id));
      return map;
    },
  });

  const approverLabelOf = (jobTitleId: string | null) => {
    const next = jobTitleId ? roleHierarchy?.get(jobTitleId) ?? null : null;
    return next ? jobTitles?.find((title) => title.id === next)?.name ?? "" : "";
  };

  const [sortBy, setSortBy] = useState<"name" | "profile">("name");
  const [status, setStatus] = useState<AccessStatusFilter>("all");
  const [open, setOpen] = useState<Set<string>>(new Set());
  const toggle = (id: string) => setOpen((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; });

  const isPendingRestrictedUser = (user: NonNullable<typeof data>[number]) =>
    user.accessProfile === "customizado" && (!user.hasConfiguredAccess || !approverLabelOf(user.jobTitleId));
  const pendingUsers = (data ?? []).filter(isPendingRestrictedUser);
  const activeUsers = (data ?? []).filter((user) => !isPendingRestrictedUser(user));
  const userFilters = useTableFilters(activeUsers, [
    { key: "name", label: "Nome", value: u => u.full_name },
    { key: "email", label: "E-mail", value: u => u.email },
    { key: "approver", label: "Cargo aprovador", value: u => approverLabelOf(u.jobTitleId) },
    { key: "role", label: "Cargo", value: u => jobTitles?.find(t => t.id === u.jobTitleId)?.name },
    { key: "profile", label: "Perfil", value: u => u.accessProfileName },
  ]);
  const sorted = [...userFilters.filtered].sort((a, b) => {
    if (sortBy === "profile") {
      const byProfile = String(a.accessProfileName).localeCompare(String(b.accessProfileName), "pt-BR");
      if (byProfile !== 0) return byProfile;
    }
    return String(a.full_name ?? "").localeCompare(String(b.full_name ?? ""), "pt-BR");
  });
  const rows = putInactiveLast(sorted.filter((u) => status === "all" || (status === "active" ? u.is_active !== false : u.is_active === false)), (u) => u.is_active !== false);
  const statusCounts = {
    all: sorted.length,
    active: sorted.filter((u) => u.is_active !== false).length,
    inactive: sorted.filter((u) => u.is_active === false).length,
  };


  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle>Usuários cadastrados</CardTitle>
        </div>
        <CardDescription>Defina o cargo principal da cadeia, cargos adicionais e o perfil de acesso.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? <p className="text-sm text-muted-foreground">Carregando...</p> :
        <>
          <div className="flex flex-wrap items-center gap-2 erp-list-toolbar">
            {userFilters.menu}
            <AccessStatusTabs value={status} onChange={setStatus} counts={statusCounts} />
            <Select value={sortBy} onValueChange={(value) => setSortBy(value as "name" | "profile")}>
              <SelectTrigger aria-label="Ordenação dos usuários" className="h-8 w-auto min-w-0 text-[length:var(--filter-fs)]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Ordenar por nome</SelectItem>
                <SelectItem value="profile">Ordenar por perfil</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {userFilters.summary}
          {pendingUsers.length > 0 ? (
            <div className="space-y-2">
              <h4 className="text-sm font-bold">Usuários pendentes</h4>
              {pendingUsers.map((user) => (
                <div key={user.id} className="grid gap-3 rounded-lg border border-border p-3 sm:grid-cols-[minmax(0,1fr)_minmax(180px,260px)_auto] sm:items-end">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{user.full_name || user.email || "Usuário"}</p>
                    <p className="truncate text-xs text-muted-foreground">{user.email || "E-mail não informado"}</p>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-medium text-muted-foreground">Cargo</span>
                    <Select
                      value={user.jobTitleId ?? "none"}
                      onValueChange={(value) => setJobTitle.mutate({ userId: user.id, jobTitleId: value === "none" ? null : value })}
                    >
                      <SelectTrigger className="h-8 w-full text-xs"><SelectValue placeholder="Sem cargo" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sem cargo</SelectItem>
                        {(jobTitles ?? []).map((title) => <SelectItem key={title.id} value={title.id}>{title.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-wrap gap-1 sm:justify-end">
                    {!user.hasConfiguredAccess ? <Badge variant="outline">Aguardando liberação de menus</Badge> : null}
                    {!approverLabelOf(user.jobTitleId) ? <Badge variant="outline">Aguardando definição do aprovador</Badge> : null}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
          {(deletionRequests ?? []).some((request) => request.status === "pendente") ? (
            <div className="space-y-2">
              <h4 className="text-sm font-bold">Exclusões pendentes</h4>
              {(deletionRequests ?? []).filter((request) => request.status === "pendente").map((request) => {
                const target = data?.find((user) => user.id === request.target_user_id);
                const requester = data?.find((user) => user.id === request.requested_by);
                const canDecide = request.requested_by !== currentUser?.id;
                return (
                  <div key={request.id} className="flex flex-col gap-2 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-medium">{target?.full_name || target?.email || "Usuário"}</p>
                      <p className="text-xs text-muted-foreground">Solicitado por {requester?.full_name || requester?.email || "Admin"}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" disabled={!canDecide || decideDeletion.isPending} onClick={() => decideDeletion.mutate({ requestId: request.id, approve: false })}>Rejeitar</Button>
                      <Button size="sm" disabled={!canDecide || decideDeletion.isPending} onClick={() => decideDeletion.mutate({ requestId: request.id, approve: true })}>Aprovar exclusão</Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
          {(() => {
            const groupOrder = sortBy === "profile" ? accessProfileDefinitions.map((item) => item.code) : ["all"];
            const groupLabel: Record<string, string> = Object.fromEntries(accessProfileDefinitions.map((item) => [item.code, `Perfil ${item.name}`]));
            groupLabel.all = "Usuários";
            const groups = groupOrder
              .map((g) => ({
                key: g,
                label: groupLabel[g] ?? g,
                users: rows.filter((u) => {
                  return g === "all" || u.accessProfile === g;
                }),
              }))
              .filter((g) => g.users.length > 0);
            if (groups.length === 0) return <p className="text-sm text-muted-foreground">Nenhum usuário.</p>;
            return groups.map((g) => (
              <div key={g.key} className="space-y-2">
                <div className="flex items-center justify-between rounded-lg bg-primary/10 px-3 py-2">
                  <h4 className="text-sm font-bold">{g.label}</h4>
                  <span className="text-xs text-muted-foreground">{g.users.length}</span>
                </div>
                <div className="space-y-2">
                  {g.users.map((u) => {
                    const primary = u.jobTitleId ?? "none";
                    const isOpen = open.has(u.id);
                    return (
                      <AccessUserRow
                        key={u.id}
                        name={u.full_name || "—"}
                        email={u.email}
                        inactive={u.is_active === false}
                        badges={u.is_active === false ? <span className="text-xs text-destructive">Inativo</span> : null}
                        controls={
                          <div className="flex shrink-0 items-center gap-1">
                            {u.id !== currentUser?.id ? (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="compactIcon" className="text-destructive hover:text-destructive" title="Solicitar exclusão" aria-label={`Solicitar exclusão de ${u.full_name || u.email}`}>
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Solicitar exclusão do usuário?</AlertDialogTitle>
                                    <AlertDialogDescription>A exclusão de {u.full_name || u.email} ficará pendente até outro Admin aprovar.</AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction disabled={requestDeletion.isPending} onClick={() => requestDeletion.mutate(u.id)}>Solicitar exclusão</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            ) : null}
                            <Button type="button" size="compactIcon" variant="ghost" className="shrink-0" aria-label={`${isOpen ? "Recolher" : "Exibir"} dados de ${u.full_name || u.email || "usuário"}`} aria-expanded={isOpen} onClick={() => toggle(u.id)}><CdeDisclosureIcon open={isOpen} screen="components/access/users-admin.tsx" /></Button>
                          </div>
                        }
                        details={isOpen ? (
                        <div className="grid grid-cols-2 gap-x-3 gap-y-2 sm:grid-cols-4">
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-medium text-muted-foreground">Cargo</span>
                            <Select
                              value={primary}
                              onValueChange={(v) => setJobTitle.mutate({ userId: u.id, jobTitleId: v === "none" ? null : v })}
                            >
                              <SelectTrigger className="h-8 w-full text-xs"><SelectValue placeholder="Sem cargo" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">Sem cargo</SelectItem>
                                {(jobTitles ?? []).map((title) => <SelectItem key={title.id} value={title.id}>{title.name}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-medium text-muted-foreground">Cargos adicionais</span>
                            <AdditionalJobTitlesSelect
                              titles={(jobTitles ?? []).filter((title) => title.id !== u.jobTitleId)}
                              value={u.additionalJobTitles.map((title) => title.id)}
                              disabled={setAdditionalJobTitles.isPending}
                              onChange={(jobTitleIds) => setAdditionalJobTitles.mutate({ userId: u.id, jobTitleIds })}
                            />
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-medium text-muted-foreground">Perfil de acesso</span>
                            <Select value={u.accessProfile} onValueChange={(value) => setAccessProfile.mutate({ userId: u.id, profile: value })}>
                              <SelectTrigger className="h-8 w-full text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="customizado">Customizado</SelectItem>
                                {accessProfileDefinitions.filter((definition) => definition.active || definition.code === u.accessProfile).map((definition) => <SelectItem key={definition.code} value={definition.code}>{definition.name}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-medium text-muted-foreground">Aprovado por (cargo)</span>
                            <div className="flex h-8 items-center rounded-md border border-input bg-muted/40 px-2 text-xs text-muted-foreground">
                              {approverLabelOf(u.jobTitleId) || "—"}
                            </div>
                          </div>
                        </div>
                        ) : null}
                      />
                    );
                  })}
                </div>
              </div>
            ));
          })()}
        </>
        }
      </CardContent>
    </Card>
  );
}

