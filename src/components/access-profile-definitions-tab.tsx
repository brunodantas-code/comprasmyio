import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { MenuPermissionSelector } from "@/components/menu-permission-selector";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { ALL_MENU_PERMISSION_KEYS, STANDARD_MENU_PERMISSION_KEYS } from "@/lib/menu-permissions";
import { deleteAccessProfile } from "@/lib/user-admin.functions";
import { useRequestTypes } from "@/components/request-types-tab";

export type AccessProfileBase = "admin" | "padrao" | "restrito";
export type AccessProfileDefinition = {
  code: string;
  name: string;
  base_profile: AccessProfileBase;
  active: boolean;
  is_system: boolean;
  permissions: Set<string>;
  requestTypes: Set<string>;
};

function makeCode(name: string) {
  return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").trim().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

export function useAccessProfileDefinitions() {
  return useQuery({
    queryKey: ["access-profile-definitions"],
    queryFn: async () => {
      const [{ data: definitions, error }, { data: permissions, error: permissionsError }, { data: requestTypes, error: requestTypesError }] = await Promise.all([
        supabase.from("access_profile_definitions").select("code,name,base_profile,active,is_system").order("name"),
        supabase.from("access_profile_permissions").select("profile_code,menu_key,allowed").eq("allowed", true),
        supabase.from("access_profile_request_types").select("profile_code,request_type_code"),
      ]);
      if (error) throw error;
      if (permissionsError) throw permissionsError;
      if (requestTypesError) throw requestTypesError;
      return (definitions ?? []).map((definition) => ({
        ...definition,
        permissions: new Set((permissions ?? []).filter((permission) => permission.profile_code === definition.code).map((permission) => permission.menu_key)),
        requestTypes: new Set((requestTypes ?? []).filter((permission) => permission.profile_code === definition.code).map((permission) => permission.request_type_code)),
      })) as AccessProfileDefinition[];
    },
  });
}

async function savePermissions(profileCode: string, permissions: Set<string>) {
  const selectablePermissions = [...permissions].filter((menuKey) => menuKey !== "usuarios" && !menuKey.startsWith("usuarios_"));
  const { error: deleteError } = await supabase.from("access_profile_permissions").delete().eq("profile_code", profileCode);
  if (deleteError) throw deleteError;
  if (selectablePermissions.length === 0) return;
  const { error } = await supabase.from("access_profile_permissions").insert(
    selectablePermissions.map((menuKey) => ({ profile_code: profileCode, menu_key: menuKey, allowed: true })),
  );
  if (error) throw error;
}

async function saveRequestTypes(profileCode: string, requestTypes: Set<string>) {
  const { error: deleteError } = await supabase.from("access_profile_request_types").delete().eq("profile_code", profileCode);
  if (deleteError) throw deleteError;
  if (requestTypes.size === 0) return;
  const { error } = await supabase.from("access_profile_request_types").insert(
    [...requestTypes].map((requestTypeCode) => ({ profile_code: profileCode, request_type_code: requestTypeCode })),
  );
  if (error) throw error;
}

export function AccessProfileDefinitionsTab() {
  const qc = useQueryClient();
  const deleteProfile = useServerFn(deleteAccessProfile);
  const { data: definitions = [], isLoading } = useAccessProfileDefinitions();
  const { data: requestTypes = [] } = useRequestTypes();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["access-profile-definitions"] });

  const create = useMutation({
    mutationFn: async ({ name, permissions, allowedRequestTypes }: { name: string; permissions: Set<string>; allowedRequestTypes: Set<string> }) => {
      const code = makeCode(name);
      if (!code) throw new Error("Informe um nome válido.");
      const { error } = await supabase.from("access_profile_definitions").insert({ code, name: name.trim(), base_profile: "restrito" });
      if (error?.code === "23505") throw new Error("Este Perfil de Acesso já está cadastrado.");
      if (error) throw error;
      try { await Promise.all([savePermissions(code, permissions), saveRequestTypes(code, allowedRequestTypes)]); }
      catch (permissionError) { await supabase.from("access_profile_definitions").delete().eq("code", code); throw permissionError; }
    },
    onSuccess: () => { toast.success("Perfil de Acesso criado"); invalidate(); },
    onError: (error: Error) => toast.error(error.message),
  });
  const update = useMutation({
    mutationFn: async ({ code, name, permissions, allowedRequestTypes }: { code: string; name: string; permissions: Set<string>; allowedRequestTypes: Set<string> }) => {
      const { error } = await supabase.from("access_profile_definitions").update({ name: name.trim() }).eq("code", code);
      if (error?.code === "23505") throw new Error("Este Perfil de Acesso já está cadastrado.");
      if (error) throw error;
      await Promise.all([savePermissions(code, permissions), saveRequestTypes(code, allowedRequestTypes)]);
    },
    onSuccess: () => { toast.success("Perfil de Acesso atualizado"); invalidate(); qc.invalidateQueries({ queryKey: ["admin-users"] }); qc.invalidateQueries({ queryKey: ["current-user"] }); },
    onError: (error: Error) => toast.error(error.message),
  });
  const toggle = useMutation({
    mutationFn: async ({ code, active }: { code: string; active: boolean }) => { const { error } = await supabase.from("access_profile_definitions").update({ active }).eq("code", code); if (error) throw error; },
    onSuccess: invalidate,
    onError: (error: Error) => toast.error(error.message),
  });
  const remove = useMutation({
    mutationFn: async ({ code, reallocations }: { code: string; reallocations: Array<{ userId: string; destinationProfile: string }> }) => deleteProfile({ data: { sourceProfile: code, reallocations } }),
    onSuccess: ({ moved }) => {
      toast.success(moved > 0 ? `Perfil excluído e ${moved} usuário(s) realocado(s)` : "Perfil de Acesso excluído");
      invalidate();
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      qc.invalidateQueries({ queryKey: ["current-user"] });
      qc.invalidateQueries({ queryKey: ["custom-access-profiles"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div><CardTitle>Perfis cadastrados</CardTitle><CardDescription>Crie perfis reutilizáveis escolhendo os menus e submenus permitidos.</CardDescription></div>
        <ProfileDialog requestTypes={requestTypes} title="Novo Perfil de Acesso" saving={create.isPending} onSave={(name, permissions, allowedRequestTypes) => create.mutateAsync({ name, permissions, allowedRequestTypes })} />
      </CardHeader>
      <CardContent>
        {isLoading ? <p className="text-sm text-muted-foreground">Carregando...</p> : (
          <Table>
            <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Acessos</TableHead><TableHead>Ativo</TableHead><TableHead aria-label="Ações" /></TableRow></TableHeader>
            <TableBody>{definitions.map((definition) => (
              <TableRow key={definition.code}>
                <TableCell className="font-medium">{definition.name}</TableCell>
                <TableCell>{definition.base_profile === "admin" ? "Todos" : `${definition.permissions.size} selecionados`}</TableCell>
                <TableCell><Switch checked={definition.active} disabled={toggle.isPending} onCheckedChange={(active) => toggle.mutate({ code: definition.code, active })} /></TableCell>
                <TableCell><div className="flex items-center justify-end gap-1"><ProfileDialog requestTypes={requestTypes} definition={definition} title="Editar Perfil de Acesso" saving={update.isPending} onSave={(name, permissions, allowedRequestTypes) => update.mutateAsync({ code: definition.code, name, permissions, allowedRequestTypes })} /><DeleteProfileDialog definition={definition} definitions={definitions} deleting={remove.isPending} onDelete={(reallocations) => remove.mutateAsync({ code: definition.code, reallocations })} /></div></TableCell>
              </TableRow>
            ))}</TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function ProfileDialog({ definition, requestTypes, title, saving, onSave }: { definition?: AccessProfileDefinition; requestTypes: Array<{ code: string; name: string; active: boolean }>; title: string; saving: boolean; onSave: (name: string, permissions: Set<string>, allowedRequestTypes: Set<string>) => Promise<unknown> }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(definition?.name ?? "");
  const [permissions, setPermissions] = useState<Set<string>>(new Set());
  const [allowedRequestTypes, setAllowedRequestTypes] = useState<Set<string>>(new Set());
  const isAdmin = definition?.base_profile === "admin";
  const reset = () => {
    setName(definition?.name ?? "");
    setPermissions(new Set(isAdmin ? ALL_MENU_PERMISSION_KEYS : definition?.permissions ?? STANDARD_MENU_PERMISSION_KEYS));
    setAllowedRequestTypes(new Set(isAdmin ? requestTypes.filter((type) => type.active).map((type) => type.code) : definition?.requestTypes ?? requestTypes.filter((type) => type.active).map((type) => type.code)));
  };
  return (
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (next) reset(); }}>
      <DialogTrigger asChild><Button size="compactIcon" variant={definition ? "ghost" : "default"} title={title} aria-label={title}>{definition ? <Pencil className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}</Button></DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>Escolha exatamente quais áreas estarão disponíveis para quem receber este perfil.</DialogDescription></DialogHeader>
        <form className="space-y-5" onSubmit={async (event) => { event.preventDefault(); if (name.trim().length < 2) return toast.error("Nome muito curto."); try { await onSave(name.trim(), permissions, permissions.has("solicitacoes_novas") ? allowedRequestTypes : new Set()); setOpen(false); } catch { /* A mensagem é exibida pela alteração. */ } }}>
          <div className="space-y-2"><Label>Nome</Label><Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Inserir nome" required /></div>
          <div className="space-y-2"><Label>Menus, submenus e tipos de solicitação</Label><MenuPermissionSelector value={permissions} onChange={(next) => { setPermissions(next); if (!next.has("solicitacoes_novas")) setAllowedRequestTypes(new Set()); }} requestTypes={requestTypes.filter((type) => type.active)} requestTypeValue={allowedRequestTypes} onRequestTypeChange={setAllowedRequestTypes} disabled={isAdmin} showAdministration={isAdmin} /></div>
          <DialogFooter><Button type="submit" disabled={saving}>Salvar perfil</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

type LinkedProfileUser = { id: string; name: string; email: string };

function DeleteProfileDialog({ definition, definitions, deleting, onDelete }: { definition: AccessProfileDefinition; definitions: AccessProfileDefinition[]; deleting: boolean; onDelete: (reallocations: Array<{ userId: string; destinationProfile: string }>) => Promise<unknown> }) {
  const [open, setOpen] = useState(false); const [users, setUsers] = useState<LinkedProfileUser[]>([]); const [destinations, setDestinations] = useState<Record<string, string>>({}); const [inspecting, setInspecting] = useState(false);
  const inspect = async (next: boolean) => {
    setOpen(next);
    if (!next) { setDestinations({}); setUsers([]); return; }
    setInspecting(true);
    const { data: links, error } = await supabase.from("user_access_profiles").select("user_id").eq("profile_definition_id", definition.code);
    const userIds = (links ?? []).map((link) => link.user_id);
    const { data: profiles, error: profilesError } = userIds.length
      ? await supabase.from("profiles").select("id,full_name,email").in("id", userIds).order("full_name")
      : { data: [], error: null };
    setInspecting(false);
    if (error || profilesError) { toast.error(error?.message ?? profilesError?.message ?? "Não foi possível carregar os usuários."); setOpen(false); return; }
    setUsers((profiles ?? []).map((profile) => ({ id: profile.id, name: profile.full_name || profile.email || "Usuário sem nome", email: profile.email || "" })));
  };
  const availableDestinations = definitions.filter((item) => item.active && item.code !== definition.code);
  const allAssigned = users.every((user) => Boolean(destinations[user.id]));
  return <Dialog open={open} onOpenChange={inspect}><DialogTrigger asChild><Button size="compactIcon" variant="ghost" className="text-destructive hover:text-destructive" title="Excluir" aria-label={`Excluir ${definition.name}`}><Trash2 className="h-3.5 w-3.5" /></Button></DialogTrigger><DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto"><DialogHeader><DialogTitle>Excluir Perfil de Acesso</DialogTitle><DialogDescription>{users.length ? `${users.length} usuário(s) estão vinculados a ${definition.name}. Escolha individualmente o novo perfil de cada usuário.` : `Confirma a exclusão de ${definition.name}?`}</DialogDescription></DialogHeader>{inspecting ? <p className="text-sm text-muted-foreground">Carregando usuários...</p> : users.length ? <div className="space-y-3">{users.map((user) => <div key={user.id} className="grid gap-2 border-b pb-3 sm:grid-cols-[minmax(0,1fr)_minmax(220px,1fr)] sm:items-center"><div className="min-w-0"><p className="truncate text-sm font-medium">{user.name}</p>{user.email && user.email !== user.name ? <p className="truncate text-xs text-muted-foreground">{user.email}</p> : null}</div><Select value={destinations[user.id] ?? ""} onValueChange={(value) => setDestinations((current) => ({ ...current, [user.id]: value }))}><SelectTrigger className="w-full"><SelectValue placeholder="Selecione o novo perfil" /></SelectTrigger><SelectContent>{availableDestinations.map((item) => <SelectItem key={item.code} value={item.code}>{item.name}</SelectItem>)}</SelectContent></Select></div>)}</div> : null}<DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button variant="destructive" disabled={deleting || inspecting || !allAssigned} onClick={async () => { try { await onDelete(users.map((user) => ({ userId: user.id, destinationProfile: destinations[user.id] }))); setOpen(false); } catch { /* A mensagem é exibida pela alteração. */ } }}>{users.length ? "Realocar e excluir" : "Excluir"}</Button></DialogFooter></DialogContent></Dialog>;
}