import { useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Minus, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LinkedRecordDeletionDialog } from "@/components/linked-record-deletion-dialog";

export type DamageReason = { code: string; name: string; position: number; active: boolean };

const makeCode = (name: string) => name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").trim().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");

export function useDamageReasons() {
  return useQuery({
    queryKey: ["damage-reasons"],
    queryFn: async () => {
      const { data, error } = await supabase.from("damage_reasons").select("code,name,position,active").order("position").order("name");
      if (error) throw error;
      return data as DamageReason[];
    },
  });
}

export function DamageReasonsTab() {
  const qc = useQueryClient();
  const { data: reasons, isLoading } = useDamageReasons();
  const [expanded, setExpanded] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const invalidate = () => qc.invalidateQueries({ queryKey: ["damage-reasons"] });
  const create = useMutation({ mutationFn: async ({ name, position }: { name: string; position: number }) => { const code = makeCode(name); if (!code) throw new Error("Informe um nome válido"); if (reasons?.some((item) => item.code === code || item.name.trim().toLocaleLowerCase("pt-BR") === name.trim().toLocaleLowerCase("pt-BR"))) throw new Error("Este motivo já está cadastrado"); const { error } = await supabase.from("damage_reasons").insert({ code, name: name.trim(), position }); if (error?.code === "23505") throw new Error("Este motivo já está cadastrado"); if (error) throw error; }, onSuccess: () => { toast.success("Motivo criado"); setCreateOpen(false); invalidate(); }, onError: (error: Error) => toast.error(error.message) });
  const update = useMutation({ mutationFn: async ({ code, name, position }: { code: string; name: string; position: number }) => { if (reasons?.some((item) => item.code !== code && item.name.trim().toLocaleLowerCase("pt-BR") === name.trim().toLocaleLowerCase("pt-BR"))) throw new Error("Este motivo já está cadastrado"); const { error } = await supabase.from("damage_reasons").update({ name: name.trim(), position }).eq("code", code); if (error) throw error; }, onSuccess: () => { toast.success("Motivo atualizado"); invalidate(); }, onError: (error: Error) => toast.error(error.message) });
  const toggle = useMutation({ mutationFn: async ({ code, active }: { code: string; active: boolean }) => { const { error } = await supabase.from("damage_reasons").update({ active }).eq("code", code); if (error) throw error; }, onSuccess: invalidate, onError: (error: Error) => toast.error(error.message) });
  const remove = useMutation({ mutationFn: async (code: string) => { const { error } = await supabase.from("damage_reasons").delete().eq("code", code); if (error) throw error; }, onSuccess: () => { toast.success("Motivo excluído"); invalidate(); }, onError: (error: Error) => toast.error(error.message) });

  return <Collapsible open={expanded} onOpenChange={setExpanded} asChild><Card>
    <CardHeader className="flex flex-row items-start justify-between gap-4"><div><CardTitle>Motivos de Avaria</CardTitle>{expanded && <CardDescription>Os motivos ativos ficam disponíveis ao registrar uma avaria.</CardDescription>}</div><div className="flex items-center gap-1"><CollapsibleContent><ReasonDialog title="Novo motivo de avaria" description="Cadastre uma nova opção para a lista de motivos." defaultPosition={Math.max(0, ...(reasons ?? []).map((item) => item.position)) + 1} saving={create.isPending} onSave={(name, position) => create.mutateAsync({ name, position })} trigger={<Button size="icon" aria-label="Criar motivo de avaria" title="Criar motivo"><Plus className="h-4 w-4" /></Button>} open={createOpen} onOpenChange={setCreateOpen} /></CollapsibleContent><CollapsibleTrigger asChild><Button size="icon" variant="ghost" aria-label={expanded ? "Recolher Motivos de Avaria" : "Expandir Motivos de Avaria"} title={expanded ? "Recolher" : "Expandir"}>{expanded ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}</Button></CollapsibleTrigger></div></CardHeader>
    <CollapsibleContent asChild><CardContent>{isLoading ? <p className="text-sm text-muted-foreground">Carregando...</p> : <Table><TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Ordem</TableHead><TableHead>Ativo</TableHead><TableHead /></TableRow></TableHeader><TableBody>{(reasons ?? []).map((reason) => <TableRow key={reason.code}><TableCell className="font-medium">{reason.name}</TableCell><TableCell>{reason.position}</TableCell><TableCell><Switch checked={reason.active} onCheckedChange={(active) => toggle.mutate({ code: reason.code, active })} /></TableCell><TableCell className="text-right"><div className="flex items-center justify-end gap-1"><ReasonDialog title="Editar motivo de avaria" defaultName={reason.name} defaultPosition={reason.position} saving={update.isPending} onSave={(name, position) => update.mutateAsync({ code: reason.code, name, position })} trigger={<Button size="icon" variant="ghost" title={`Editar ${reason.name}`} aria-label={`Editar ${reason.name}`}><Pencil className="h-4 w-4" /></Button>} /><LinkedRecordDeletionDialog entityId={reason.code} entityName={reason.name} entityLabel="motivo de avaria" linkField="request_type" registry="damage_reason" destinations={(reasons ?? []).filter((item) => item.active).map((item) => ({ id: item.code, name: item.name }))} onDelete={() => remove.mutate(reason.code)} deleting={remove.isPending} /></div></TableCell></TableRow>)}{!reasons?.length && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Nenhum motivo cadastrado.</TableCell></TableRow>}</TableBody></Table>}</CardContent></CollapsibleContent>
  </Card></Collapsible>;
}

function ReasonDialog({ title, description, defaultName = "", defaultPosition, saving, onSave, trigger, open: controlledOpen, onOpenChange: controlledOnOpenChange }: { title: string; description?: string; defaultName?: string; defaultPosition: number; saving: boolean; onSave: (name: string, position: number) => Promise<unknown>; trigger: ReactNode; open?: boolean; onOpenChange?: (open: boolean) => void }) {
  const [internalOpen, setInternalOpen] = useState(false); const [name, setName] = useState(defaultName); const [position, setPosition] = useState(String(defaultPosition)); const open = controlledOpen ?? internalOpen; const setOpen = controlledOnOpenChange ?? setInternalOpen;
  return <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (next) { setName(defaultName); setPosition(String(defaultPosition)); } }}><DialogTrigger asChild>{trigger}</DialogTrigger><DialogContent><DialogHeader><DialogTitle>{title}</DialogTitle>{description && <DialogDescription>{description}</DialogDescription>}</DialogHeader><form className="space-y-4" onSubmit={async (event) => { event.preventDefault(); const order = Number(position); if (name.trim().length < 2 || name.trim().length > 100) return toast.error("Informe um nome entre 2 e 100 caracteres"); if (!Number.isInteger(order) || order < 0) return toast.error("Informe uma ordem válida"); try { await onSave(name.trim(), order); setOpen(false); } catch { /* A alteração exibe a mensagem. */ } }}><div className="space-y-2"><Label htmlFor={`damage-reason-name-${defaultName || "new"}`}>Nome</Label><Input id={`damage-reason-name-${defaultName || "new"}`} maxLength={100} value={name} onChange={(event) => setName(event.target.value)} required /></div><div className="space-y-2"><Label htmlFor={`damage-reason-position-${defaultName || "new"}`}>Ordem</Label><Input id={`damage-reason-position-${defaultName || "new"}`} type="number" min={0} step={1} value={position} onChange={(event) => setPosition(event.target.value)} required /></div><DialogFooter><Button type="submit" disabled={saving}>Salvar</Button></DialogFooter></form></DialogContent></Dialog>;
}