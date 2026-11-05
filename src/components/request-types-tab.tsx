import { Fragment, useState } from "react";
import type React from "react";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronUp, ChevronDown, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LinkedRecordDeletionDialog } from "@/components/linked-record-deletion-dialog";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export type RequestTypeRecord = { code: string; name: string; active: boolean; position: number; model_code: string; is_system: boolean };

export const REQUEST_TYPE_FALLBACKS: Record<string, string> = {
  materiais: "Materiais",
  servicos: "Serviços",
  viagens: "Viagens",
  reembolso: "Reembolsos",
  pagamento: "Pagamento",
  rh: "Contratação de RH",
  importacao: "Importação",
  dispositivos: "Dispositivos",
};

export function useRequestTypes() {
  return useQuery({
    queryKey: ["request-types"],
    queryFn: async () => {
      const { data, error } = await supabase.from("request_types").select("code,name,active,position,model_code,is_system").order("position");
      if (error) throw error;
      return data as RequestTypeRecord[];
    },
  });
}

export function requestTypeName(code: string | null | undefined, types?: RequestTypeRecord[]) {
  if (!code) return "—";
  return types?.find((type) => type.code === code)?.name ?? REQUEST_TYPE_FALLBACKS[code] ?? code;
}

export function requestTypeModel(code: string | null | undefined, types?: RequestTypeRecord[]) {
  if (!code) return "materiais";
  return types?.find((type) => type.code === code)?.model_code ?? code;
}

function makeCode(name: string) {
  return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").trim().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

export function RequestTypesTab() {
  const qc = useQueryClient();
  const { data: types, isLoading } = useRequestTypes();
  const [createOpen, setCreateOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [openSubs, setOpenSubs] = useState<Record<string, boolean>>({});
  const { data: canManageSubs } = useCanManageRequestSubtypes();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["request-types"] });

  const create = useMutation({
    mutationFn: async ({ name, modelCode }: { name: string; modelCode: string }) => {
      const code = makeCode(name);
      if (!code) throw new Error("Informe um nome válido");
      const normalized = name.trim().toLocaleLowerCase("pt-BR");
      if (types?.some((type) => type.name.trim().toLocaleLowerCase("pt-BR") === normalized || type.code === code)) throw new Error("Este tipo de solicitação já está cadastrado");
      const position = Math.max(0, ...(types ?? []).map((type) => type.position)) + 1;
      const { error } = await supabase.from("request_types").insert({ code, name: name.trim(), model_code: modelCode, position });
      if (error?.code === "23505") throw new Error("Este tipo de solicitação já está cadastrado");
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Tipo criado"); setCreateOpen(false); invalidate(); },
    onError: (error: Error) => toast.error(error.message),
  });

  const update = useMutation({
    mutationFn: async ({ code, name }: { code: string; name: string }) => {
      const normalized = name.trim().toLocaleLowerCase("pt-BR");
      if (types?.some((type) => type.code !== code && type.name.trim().toLocaleLowerCase("pt-BR") === normalized)) {
        throw new Error("Este tipo de solicitação já está cadastrado");
      }
      const { error } = await supabase.from("request_types").update({ name: name.trim() }).eq("code", code);
      if (error?.code === "23505") throw new Error("Este tipo de solicitação já está cadastrado");
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Tipo atualizado"); invalidate(); },
    onError: (error: Error) => toast.error(error.message),
  });

  const toggle = useMutation({
    mutationFn: async ({ code, active }: { code: string; active: boolean }) => {
      const { error } = await supabase.from("request_types").update({ active }).eq("code", code);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (error: Error) => toast.error(error.message),
  });

  const remove = useMutation({
    mutationFn: async (code: string) => {
      const { error } = await supabase.rpc("admin_delete_request_type", { _code: code });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Tipo excluído"); invalidate(); },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <Collapsible open={expanded} onOpenChange={setExpanded} asChild>
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div><CardTitle>Tipos de Solicitação</CardTitle>{expanded && <CardDescription>Crie tipos a partir de um modelo de formulário existente.</CardDescription>}</div>
        <div className="flex items-center gap-1">
          <CollapsibleContent><CreateRequestTypeDialog open={createOpen} onOpenChange={setCreateOpen} saving={create.isPending} onSave={(name, modelCode) => create.mutateAsync({ name, modelCode })} /></CollapsibleContent>
          <CollapsibleTrigger asChild><Button size="compactIcon" variant="ghost" aria-label={expanded ? "Recolher Tipos de Solicitação" : "Expandir Tipos de Solicitação"} title={expanded ? "Recolher" : "Expandir"}>{expanded ? <ChevronUp className="h-3.5 w-3.5"  /> : <ChevronDown className="h-3.5 w-3.5"  />}</Button></CollapsibleTrigger>
        </div>
      </CardHeader>
      <CollapsibleContent asChild><CardContent>
        {isLoading ? <p className="text-sm text-muted-foreground">Carregando...</p> : (
          <Table>
            <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Modelo</TableHead><TableHead>Ativo</TableHead><TableHead /></TableRow></TableHeader>
            <TableBody>
              {(types ?? []).map((type) => (
                <Fragment key={type.code}>
                <TableRow>
                  <TableCell className="font-medium">{SUBTYPE_MODELS.includes(type.model_code) ? (
                    <button type="button" className="inline-flex items-center gap-1 text-left" onClick={() => setOpenSubs((prev) => ({ ...prev, [type.code]: !prev[type.code] }))} aria-label={openSubs[type.code] ? `Recolher opções de ${type.name}` : `Exibir opções de ${type.name}`}>
                      {openSubs[type.code] ? <ChevronUp className="h-3.5 w-3.5 text-primary" /> : <ChevronDown className="h-3.5 w-3.5 text-primary" />}{type.name}
                    </button>) : <span className="pl-[18px]">{type.name}</span>}</TableCell>
                  <TableCell>{REQUEST_TYPE_FALLBACKS[type.model_code] ?? type.model_code}</TableCell>
                  <TableCell><Switch checked={type.active} onCheckedChange={(active) => toggle.mutate({ code: type.code, active })} /></TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      <EditRequestTypeDialog type={type} saving={update.isPending} onSave={(name) => update.mutateAsync({ code: type.code, name })} />
                      <LinkedRecordDeletionDialog
                        entityId={type.code}
                        entityName={type.name}
                        entityLabel="tipo de solicitação"
                        linkField="request_type"
                        registry="request_type"
                        destinations={(types ?? []).filter((item) => item.active).map((item) => ({ id: item.code, name: item.name }))}
                        deleteBlockedReason={type.is_system ? "Este é um tipo estrutural do sistema. Ele pode ser editado ou desativado, mas não excluído." : undefined}
                        onDelete={() => remove.mutate(type.code)}
                        deleting={remove.isPending}
                      />
                    </div>
                  </TableCell>
                </TableRow>
                {openSubs[type.code] && SUBTYPE_MODELS.includes(type.model_code) && <RequestSubtypesRows type={type} canManage={Boolean(canManageSubs)} />}
                </Fragment>
              ))}
              {!types?.length && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Nenhum tipo cadastrado.</TableCell></TableRow>}
            </TableBody>
          </Table>
        )}
      </CardContent></CollapsibleContent>
    </Card>
    </Collapsible>
  );
}

function CreateRequestTypeDialog({ open, onOpenChange, saving, onSave }: { open: boolean; onOpenChange: (open: boolean) => void; saving: boolean; onSave: (name: string, modelCode: string) => Promise<unknown> }) {
  const [name, setName] = useState("");
  const [modelCode, setModelCode] = useState("");
  return <Dialog open={open} onOpenChange={(next) => { onOpenChange(next); if (!next) { setName(""); setModelCode(""); } }}>
    <DialogTrigger asChild><Button size="compactIcon" variant="ghost" aria-label="Criar tipo de solicitação" title="Criar tipo"><Plus className="h-3.5 w-3.5" /></Button></DialogTrigger>
    <DialogContent><DialogHeader><DialogTitle>Novo tipo de solicitação</DialogTitle><DialogDescription>Escolha o formulário e as regras que este tipo reutilizará.</DialogDescription></DialogHeader>
      <form className="space-y-4" onSubmit={async (event) => { event.preventDefault(); if (name.trim().length < 2) return toast.error("Nome muito curto"); if (!modelCode) return toast.error("Selecione um modelo"); try { await onSave(name.trim(), modelCode); } catch { /* A alteração exibe a mensagem. */ } }}>
        <div className="space-y-2"><Label htmlFor="new-request-type-name">Nome</Label><Input id="new-request-type-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Inserir nome" required /></div>
        <div className="space-y-2"><Label>Modelo</Label><Select value={modelCode} onValueChange={setModelCode}><SelectTrigger><SelectValue placeholder="Selecione o modelo" /></SelectTrigger><SelectContent>{Object.entries(REQUEST_TYPE_FALLBACKS).map(([code, label]) => <SelectItem key={code} value={code}>{label}</SelectItem>)}</SelectContent></Select></div>
        <DialogFooter><Button type="submit" disabled={saving}>Criar</Button></DialogFooter>
      </form>
    </DialogContent>
  </Dialog>;
}

function EditRequestTypeDialog({ type, saving, onSave }: { type: RequestTypeRecord; saving: boolean; onSave: (name: string) => Promise<unknown> }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(type.name);
  return (
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (next) setName(type.name); }}>
      <DialogTrigger asChild><Button size="compactIcon" variant="ghost" title="Editar" aria-label={`Editar ${type.name}`}><Pencil className="h-3.5 w-3.5" /></Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Editar Tipo de Solicitação</DialogTitle></DialogHeader>
        <form className="space-y-4" onSubmit={async (event) => {
          event.preventDefault();
          if (name.trim().length < 2) return toast.error("Nome muito curto");
          try { await onSave(name.trim()); setOpen(false); } catch { /* A alteração exibe a mensagem. */ }
        }}>
          <div className="space-y-2"><Label htmlFor={`request-type-${type.code}`}>Nome</Label><Input id={`request-type-${type.code}`} value={name} onChange={(event) => setName(event.target.value)} required /></div>
          <DialogFooter><Button type="submit" disabled={saving}>Salvar</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
export type RequestSubtype = { id: string; request_type_code: string; code: string; name: string; form_kind: string; active: boolean; position: number; is_system: boolean };

export const SUBTYPE_NAME_CACHE: Record<string, string> = {};

export const SUBTYPE_MODELS = ["viagens", "materiais", "servicos"];

export function useRequestSubtypes() {
  return useQuery({
    queryKey: ["request-subtypes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("request_subtypes").select("id,request_type_code,code,name,form_kind,active,position,is_system").order("position");
      if (error) throw error;
      for (const item of data as RequestSubtype[]) SUBTYPE_NAME_CACHE[item.code] = item.name;
      return data as RequestSubtype[];
    },
  });
}

export function useCanManageRequestSubtypes() {
  return useQuery({
    queryKey: ["can-manage-request-subtypes"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return false;
      const { data, error } = await supabase.rpc("can_manage_request_subtypes", { _user_id: auth.user.id });
      if (error) return false;
      return Boolean(data);
    },
  });
}

function RequestSubtypesRows({ type, canManage }: { type: RequestTypeRecord; canManage: boolean }) {
  const qc = useQueryClient();
  const { data: all } = useRequestSubtypes();
  const items = (all ?? []).filter((s) => s.request_type_code === type.code);
  const isTravel = type.model_code === "viagens";
  const invalidate = () => qc.invalidateQueries({ queryKey: ["request-subtypes"] });
  const fail = (error: Error & { code?: string }) => toast.error(error.code === "23505" ? "Esta opção já está cadastrada" : error.message);
  const create = useMutation({
    mutationFn: async (name: string) => {
      const code = makeCode(name);
      if (!code) throw new Error("Informe um nome válido");
      const { data: auth } = await supabase.auth.getUser();
      const position = Math.max(0, ...items.map((s) => s.position)) + 1;
      const { error } = await supabase.from("request_subtypes").insert({ request_type_code: type.code, code, name: name.trim(), form_kind: isTravel ? "expense" : "category", position, created_by: auth.user?.id ?? null });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Opção criada"); invalidate(); },
    onError: fail,
  });
  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: { name?: string; active?: boolean } }) => {
      const { error } = await supabase.from("request_subtypes").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: fail,
  });
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("request_subtypes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Opção excluída"); invalidate(); },
    onError: fail,
  });
  return <>
    {items.map((s) => (
      <TableRow key={s.id} className="bg-muted/30">
        <TableCell className="pl-10 text-sm">{s.name}</TableCell>
        <TableCell className="text-sm text-muted-foreground">{s.form_kind === "trip" ? "Destino e datas" : s.form_kind === "rental" ? "Retirada e devolução" : s.form_kind === "expense" ? "Descrição, valor e data" : "Categoria"}</TableCell>
        <TableCell><Switch checked={s.active} disabled={!canManage} onCheckedChange={(active) => update.mutate({ id: s.id, patch: { active } })} /></TableCell>
        <TableCell className="text-right whitespace-nowrap">
          {canManage && <div className="flex items-center justify-end gap-1">
            <SubtypeNameDialog title="Editar opção" initial={s.name} trigger={<Button size="compactIcon" variant="ghost" title="Editar" aria-label={`Editar ${s.name}`}><Pencil className="h-3.5 w-3.5" /></Button>} onSave={(name) => update.mutateAsync({ id: s.id, patch: { name } })} />
            {!s.is_system && <ConfirmDeleteButton title="Excluir opção?" description={`Confirma a exclusão de "${s.name}"? Solicitações já enviadas mantêm o registro.`} ariaLabel={`Excluir ${s.name}`} onConfirm={() => remove.mutate(s.id)} />}
          </div>}
        </TableCell>
      </TableRow>
    ))}
    {!items.length && <TableRow className="bg-muted/30"><TableCell colSpan={4} className="pl-10 text-sm text-muted-foreground">Nenhuma opção cadastrada.</TableCell></TableRow>}
    {canManage && <TableRow className="bg-muted/30"><TableCell colSpan={4} className="pl-10">
      <SubtypeNameDialog title={`Nova opção em ${type.name}`} initial="" trigger={<Button size="sm" variant="ghost" className="h-7 gap-1 px-2 text-xs"><Plus className="h-3.5 w-3.5" />Nova opção</Button>} onSave={(name) => create.mutateAsync(name)} />
    </TableCell></TableRow>}
  </>;
}

function SubtypeNameDialog({ title, initial, trigger, onSave }: { title: string; initial: string; trigger: React.ReactNode; onSave: (name: string) => Promise<unknown> }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(initial);
  return <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (next) setName(initial); }}>
    <DialogTrigger asChild>{trigger}</DialogTrigger>
    <DialogContent><DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
      <form className="space-y-4" onSubmit={async (event) => { event.preventDefault(); if (name.trim().length < 2) return toast.error("Nome muito curto"); try { await onSave(name.trim()); setOpen(false); } catch { /* exibido */ } }}>
        <div className="space-y-2"><Label htmlFor="subtype-name">Nome</Label><Input id="subtype-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Inserir nome" required /></div>
        <DialogFooter><Button type="submit">Salvar</Button></DialogFooter>
      </form>
    </DialogContent>
  </Dialog>;
}
