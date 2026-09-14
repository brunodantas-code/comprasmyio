import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { relocateAccessProfileUsers } from "@/lib/user-admin.functions";

export type AccessProfileBase = "admin" | "padrao" | "restrito";
export type AccessProfileDefinition = { code: string; name: string; base_profile: AccessProfileBase; active: boolean; is_system: boolean };

const BASE_LABELS: Record<AccessProfileBase, string> = { admin: "Admin", padrao: "Padrão", restrito: "Restrito" };

function makeCode(name: string) {
  return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").trim().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

export function useAccessProfileDefinitions() {
  return useQuery({
    queryKey: ["access-profile-definitions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("access_profile_definitions").select("code,name,base_profile,active,is_system").order("name");
      if (error) throw error;
      return data as AccessProfileDefinition[];
    },
  });
}

export function AccessProfileDefinitionsTab() {
  const qc = useQueryClient();
  const relocateUsers = useServerFn(relocateAccessProfileUsers);
  const { data: definitions = [], isLoading } = useAccessProfileDefinitions();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["access-profile-definitions"] });

  const create = useMutation({
    mutationFn: async ({ name, base }: { name: string; base: AccessProfileBase }) => {
      const code = makeCode(name);
      if (!code) throw new Error("Informe um nome válido.");
      const { error } = await supabase.from("access_profile_definitions").insert({ code, name: name.trim(), base_profile: base });
      if (error?.code === "23505") throw new Error("Este Perfil de Acesso já está cadastrado.");
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Perfil de Acesso criado"); invalidate(); },
    onError: (error: Error) => toast.error(error.message),
  });
  const update = useMutation({
    mutationFn: async ({ code, name, base }: { code: string; name: string; base: AccessProfileBase }) => {
      const { error } = await supabase.from("access_profile_definitions").update({ name: name.trim(), base_profile: base }).eq("code", code);
      if (error?.code === "23505") throw new Error("Este Perfil de Acesso já está cadastrado.");
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Perfil de Acesso atualizado"); invalidate(); qc.invalidateQueries({ queryKey: ["admin-users"] }); },
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

  return <Card><CardHeader className="flex flex-row items-start justify-between gap-4"><div><CardTitle>Perfil de Acesso</CardTitle><CardDescription>Cadastre os perfis disponíveis na lista de usuários a partir de um modelo existente.</CardDescription></div><ProfileDialog title="Novo Perfil de Acesso" saving={create.isPending} onSave={(name, base) => create.mutateAsync({ name, base })} /></CardHeader><CardContent>{isLoading ? <p className="text-sm text-muted-foreground">Carregando...</p> : <Table><TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Modelo base</TableHead><TableHead>Ativo</TableHead><TableHead aria-label="Ações" /></TableRow></TableHeader><TableBody>{definitions.map((definition) => <TableRow key={definition.code}><TableCell className="font-medium">{definition.name}</TableCell><TableCell>{BASE_LABELS[definition.base_profile]}</TableCell><TableCell><Switch checked={definition.active} disabled={toggle.isPending} onCheckedChange={(active) => toggle.mutate({ code: definition.code, active })} /></TableCell><TableCell><div className="flex items-center justify-end gap-1"><ProfileDialog definition={definition} title="Editar Perfil de Acesso" saving={update.isPending} onSave={(name, base) => update.mutateAsync({ code: definition.code, name, base })} />{!definition.is_system ? <DeleteProfileDialog definition={definition} definitions={definitions} deleting={remove.isPending} onRelocate={async (destination) => { const result = await relocateUsers({ data: { sourceProfile: definition.code, destinationProfile: destination } }); qc.invalidateQueries({ queryKey: ["admin-users"] }); qc.invalidateQueries({ queryKey: ["restricted-access-profiles"] }); return result.moved; }} onDelete={() => remove.mutateAsync(definition.code)} /> : null}</div></TableCell></TableRow>)}</TableBody></Table>}</CardContent></Card>;
}

function ProfileDialog({ definition, title, saving, onSave }: { definition?: AccessProfileDefinition; title: string; saving: boolean; onSave: (name: string, base: AccessProfileBase) => Promise<unknown> }) {
  const [open, setOpen] = useState(false); const [name, setName] = useState(definition?.name ?? ""); const [base, setBase] = useState<AccessProfileBase>(definition?.base_profile ?? "restrito");
  return <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (next) { setName(definition?.name ?? ""); setBase(definition?.base_profile ?? "restrito"); } }}><DialogTrigger asChild><Button size="icon" variant={definition ? "ghost" : "default"} title={title} aria-label={title}>{definition ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>O modelo base define as permissões herdadas pelo perfil.</DialogDescription></DialogHeader><form className="space-y-4" onSubmit={async (event) => { event.preventDefault(); if (name.trim().length < 2) return toast.error("Nome muito curto."); try { await onSave(name.trim(), base); setOpen(false); } catch { /* A mensagem é exibida pela alteração. */ } }}><div className="space-y-2"><Label>Nome</Label><Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Inserir nome" required /></div><div className="space-y-2"><Label>Modelo base</Label><Select value={base} disabled={definition?.is_system} onValueChange={(value) => setBase(value as AccessProfileBase)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(BASE_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div><DialogFooter><Button type="submit" disabled={saving}>Salvar</Button></DialogFooter></form></DialogContent></Dialog>;
}

function DeleteProfileDialog({ definition, definitions, deleting, onRelocate, onDelete }: { definition: AccessProfileDefinition; definitions: AccessProfileDefinition[]; deleting: boolean; onRelocate: (destination: string) => Promise<number>; onDelete: () => Promise<unknown> }) {
  const [open, setOpen] = useState(false); const [destination, setDestination] = useState(""); const [count, setCount] = useState(0); const [moving, setMoving] = useState(false);
  const inspect = async (next: boolean) => { setOpen(next); if (!next) return; const { count: linked } = await supabase.from("user_access_profiles").select("user_id", { count: "exact", head: true }).eq("profile_definition_id", definition.code); setCount(linked ?? 0); };
  const relocate = async () => { if (!destination) return toast.error("Selecione o novo perfil."); setMoving(true); try { const moved = await onRelocate(destination); setCount(0); toast.success(`${moved} usuário(s) realocado(s)`); } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível realocar os usuários."); } finally { setMoving(false); } };
  return <Dialog open={open} onOpenChange={inspect}><DialogTrigger asChild><Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" title="Excluir" aria-label={`Excluir ${definition.name}`}><Trash2 className="h-4 w-4" /></Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Excluir Perfil de Acesso</DialogTitle><DialogDescription>{count ? `${count} usuário(s) estão vinculados a ${definition.name}. Realoque-os antes de excluir.` : `Confirma a exclusão de ${definition.name}?`}</DialogDescription></DialogHeader>{count ? <div className="flex gap-2"><Select value={destination} onValueChange={setDestination}><SelectTrigger><SelectValue placeholder="Novo perfil" /></SelectTrigger><SelectContent>{definitions.filter((item) => item.active && item.code !== definition.code).map((item) => <SelectItem key={item.code} value={item.code}>{item.name}</SelectItem>)}</SelectContent></Select><Button variant="outline" disabled={moving} onClick={relocate}>Realocar</Button></div> : null}<DialogFooter><Button variant="destructive" disabled={deleting || count > 0} onClick={async () => { try { await onDelete(); setOpen(false); } catch { /* A mensagem é exibida pela alteração. */ } }}>Excluir</Button></DialogFooter></DialogContent></Dialog>;
}