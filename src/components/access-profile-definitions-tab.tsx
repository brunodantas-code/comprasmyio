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
import { relocateAccessProfileUsers } from "@/lib/user-admin.functions";
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
  const relocateUsers = useServerFn(relocateAccessProfileUsers);
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
    mutationFn: async (code: string) => { const { error } = await supabase.from("access_profile_definitions").delete().eq("code", code); if (error?.code === "23503") throw new Error("Este perfil possui usuários vinculados. Realoque-os antes de excluir."); if (error) throw error; },
    onSuccess: () => { toast.success("Perfil de Acesso excluído"); invalidate(); },
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
                <TableCell><Switch checked={definition.active} disabled={definition.is_system || toggle.isPending} onCheckedChange={(active) => toggle.mutate({ code: definition.code, active })} /></TableCell>
                <TableCell><div className="flex items-center justify-end gap-1"><ProfileDialog requestTypes={requestTypes} definition={definition} title="Editar Perfil de Acesso" saving={update.isPending} onSave={(name, permissions, allowedRequestTypes) => update.mutateAsync({ code: definition.code, name, permissions, allowedRequestTypes })} />{!definition.is_system ? <DeleteProfileDialog definition={definition} definitions={definitions} deleting={remove.isPending} onRelocate={async (destination) => { const result = await relocateUsers({ data: { sourceProfile: definition.code, destinationProfile: destination } }); qc.invalidateQueries({ queryKey: ["admin-users"] }); return result.moved; }} onDelete={() => remove.mutateAsync(definition.code)} /> : null}</div></TableCell>
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
      <DialogTrigger asChild><Button size="icon" variant={definition ? "ghost" : "default"} title={title} aria-label={title}>{definition ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}</Button></DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>Escolha exatamente quais áreas estarão disponíveis para quem receber este perfil.</DialogDescription></DialogHeader>
        <form className="space-y-5" onSubmit={async (event) => { event.preventDefault(); if (name.trim().length < 2) return toast.error("Nome muito curto."); try { await onSave(name.trim(), permissions, allowedRequestTypes); setOpen(false); } catch { /* A mensagem é exibida pela alteração. */ } }}>
          <div className="space-y-2"><Label>Nome</Label><Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Inserir nome" required /></div>
          <div className="space-y-2"><Label>Menus, submenus e tipos de solicitação</Label><MenuPermissionSelector value={permissions} onChange={setPermissions} requestTypes={requestTypes.filter((type) => type.active)} requestTypeValue={allowedRequestTypes} onRequestTypeChange={setAllowedRequestTypes} disabled={isAdmin} showAdministration={isAdmin} /></div>
          <DialogFooter><Button type="submit" disabled={saving}>Salvar perfil</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteProfileDialog({ definition, definitions, deleting, onRelocate, onDelete }: { definition: AccessProfileDefinition; definitions: AccessProfileDefinition[]; deleting: boolean; onRelocate: (destination: string) => Promise<number>; onDelete: () => Promise<unknown> }) {
  const [open, setOpen] = useState(false); const [destination, setDestination] = useState(""); const [count, setCount] = useState(0); const [moving, setMoving] = useState(false);
  const inspect = async (next: boolean) => { setOpen(next); if (!next) return; const { count: linked } = await supabase.from("user_access_profiles").select("user_id", { count: "exact", head: true }).eq("profile_definition_id", definition.code).eq("is_customized", false); setCount(linked ?? 0); };
  const relocate = async () => { if (!destination) return toast.error("Selecione o novo perfil."); setMoving(true); try { const moved = await onRelocate(destination); setCount(0); toast.success(`${moved} usuário(s) realocado(s)`); } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível realocar os usuários."); } finally { setMoving(false); } };
  return <Dialog open={open} onOpenChange={inspect}><DialogTrigger asChild><Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" title="Excluir" aria-label={`Excluir ${definition.name}`}><Trash2 className="h-4 w-4" /></Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Excluir Perfil de Acesso</DialogTitle><DialogDescription>{count ? `${count} usuário(s) estão vinculados a ${definition.name}. Realoque-os antes de excluir.` : `Confirma a exclusão de ${definition.name}?`}</DialogDescription></DialogHeader>{count ? <div className="flex gap-2"><Select value={destination} onValueChange={setDestination}><SelectTrigger className="min-w-0 flex-1"><SelectValue placeholder="Novo perfil" /></SelectTrigger><SelectContent>{definitions.filter((item) => item.active && item.code !== definition.code).map((item) => <SelectItem key={item.code} value={item.code}>{item.name}</SelectItem>)}</SelectContent></Select><Button variant="outline" disabled={moving} onClick={relocate}>Realocar</Button></div> : null}<DialogFooter><Button variant="destructive" disabled={deleting || count > 0} onClick={async () => { try { await onDelete(); setOpen(false); } catch { /* A mensagem é exibida pela alteração. */ } }}>Excluir</Button></DialogFooter></DialogContent></Dialog>;
}