import { useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronUp, ChevronDown, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export type DeliveryPoint = { code: string; name: string; address: string; position: number; active: boolean; is_default: boolean };

const makeCode = (name: string) => name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").trim().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");

export function useDeliveryPoints(activeOnly = false) {
  return useQuery({
    queryKey: ["delivery-points", activeOnly],
    queryFn: async () => {
      let query = supabase.from("delivery_points").select("code,name,address,position,active,is_default").order("position").order("name");
      if (activeOnly) query = query.eq("active", true);
      const { data, error } = await query;
      if (error) throw error;
      return data as DeliveryPoint[];
    },
  });
}

export function DeliveryPointsTab() {
  const qc = useQueryClient();
  const { data: points, isLoading } = useDeliveryPoints();
  const [expanded, setExpanded] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const invalidate = () => qc.invalidateQueries({ queryKey: ["delivery-points"] });
  const duplicate = (name: string, code?: string) => points?.some((item) => item.code !== code && item.name.trim().toLocaleLowerCase("pt-BR") === name.trim().toLocaleLowerCase("pt-BR"));

  const create = useMutation({ mutationFn: async (value: Omit<DeliveryPoint, "code" | "active">) => { const code = makeCode(value.name); if (!code) throw new Error("Informe um nome válido"); if (duplicate(value.name)) throw new Error("Este ponto já está cadastrado"); const { error } = await supabase.from("delivery_points").insert({ ...value, code }); if (error?.code === "23505") throw new Error("Este ponto já está cadastrado"); if (error) throw error; }, onSuccess: () => { toast.success("Ponto de entrega criado"); setCreateOpen(false); invalidate(); }, onError: (error: Error) => toast.error(error.message) });
  const update = useMutation({ mutationFn: async ({ code, ...value }: Omit<DeliveryPoint, "active">) => { if (duplicate(value.name, code)) throw new Error("Este ponto já está cadastrado"); const { error } = await supabase.from("delivery_points").update(value).eq("code", code); if (error?.code === "23505") throw new Error("Já existe outro ponto padrão ou com este nome"); if (error) throw error; }, onSuccess: () => { toast.success("Ponto de entrega atualizado"); invalidate(); }, onError: (error: Error) => toast.error(error.message) });
  const toggle = useMutation({ mutationFn: async ({ code, active }: { code: string; active: boolean }) => { const { error } = await supabase.from("delivery_points").update({ active }).eq("code", code); if (error) throw error; }, onSuccess: invalidate, onError: (error: Error) => toast.error(error.message) });
  const remove = useMutation({ mutationFn: async (code: string) => { const { error } = await supabase.from("delivery_points").delete().eq("code", code); if (error) throw error; }, onSuccess: () => { toast.success("Ponto de entrega excluído"); invalidate(); }, onError: (error: Error) => toast.error(error.message) });

  return <Collapsible open={expanded} onOpenChange={setExpanded} asChild><Card>
    <CardHeader className="flex flex-row items-start justify-between gap-4"><div><CardTitle>Pontos de Entrega</CardTitle>{expanded && <CardDescription>As opções ativas ficam disponíveis nas solicitações de materiais.</CardDescription>}</div><div className="flex items-center gap-1"><CollapsibleContent><DeliveryPointDialog title="Novo ponto de entrega" description="Cadastre uma nova opção para a lista de entrega." defaultPosition={Math.max(0, ...(points ?? []).map((item) => item.position)) + 1} saving={create.isPending} onSave={(value) => create.mutateAsync(value)} trigger={<Button size="compactIcon" aria-label="Criar ponto de entrega" title="Criar ponto"><Plus className="h-3.5 w-3.5" /></Button>} open={createOpen} onOpenChange={setCreateOpen} /></CollapsibleContent><CollapsibleTrigger asChild><Button size="compactIcon" variant="ghost" aria-label={expanded ? "Recolher Pontos de Entrega" : "Expandir Pontos de Entrega"} title={expanded ? "Recolher" : "Expandir"}>{expanded ? <ChevronUp className="h-3.5 w-3.5"  /> : <ChevronDown className="h-3.5 w-3.5"  />}</Button></CollapsibleTrigger></div></CardHeader>
    <CollapsibleContent asChild><CardContent>{isLoading ? <p className="text-sm text-muted-foreground">Carregando...</p> : <Table><TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Endereço</TableHead><TableHead>Ordem</TableHead><TableHead>Padrão</TableHead><TableHead>Ativo</TableHead><TableHead /></TableRow></TableHeader><TableBody>{(points ?? []).map((point) => <TableRow key={point.code}><TableCell className="font-medium">{point.name}</TableCell><TableCell>{point.address}</TableCell><TableCell>{point.position}</TableCell><TableCell>{point.is_default ? "Sim" : "Não"}</TableCell><TableCell><Switch checked={point.active} onCheckedChange={(active) => toggle.mutate({ code: point.code, active })} /></TableCell><TableCell className="text-right"><div className="flex items-center justify-end gap-1"><DeliveryPointDialog title="Editar ponto de entrega" defaultName={point.name} defaultAddress={point.address} defaultPosition={point.position} defaultIsDefault={point.is_default} saving={update.isPending} onSave={(value) => update.mutateAsync({ code: point.code, ...value })} trigger={<Button size="compactIcon" variant="ghost" title={`Editar ${point.name}`} aria-label={`Editar ${point.name}`}><Pencil className="h-3.5 w-3.5" /></Button>} /><ConfirmDeleteButton title={`Excluir ${point.name}?`} description="O ponto será retirado da lista de novas solicitações. Os pedidos já registrados manterão o endereço salvo." onConfirm={() => remove.mutate(point.code)} pending={remove.isPending} ariaLabel={`Excluir ${point.name}`} /></div></TableCell></TableRow>)}{!points?.length && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Nenhum ponto cadastrado.</TableCell></TableRow>}</TableBody></Table>}</CardContent></CollapsibleContent>
  </Card></Collapsible>;
}

function DeliveryPointDialog({ title, description, defaultName = "", defaultAddress = "", defaultPosition, defaultIsDefault = false, saving, onSave, trigger, open: controlledOpen, onOpenChange: controlledOnOpenChange }: { title: string; description?: string; defaultName?: string; defaultAddress?: string; defaultPosition: number; defaultIsDefault?: boolean; saving: boolean; onSave: (value: Omit<DeliveryPoint, "code" | "active">) => Promise<unknown>; trigger: ReactNode; open?: boolean; onOpenChange?: (open: boolean) => void }) {
  const [internalOpen, setInternalOpen] = useState(false); const [name, setName] = useState(defaultName); const [address, setAddress] = useState(defaultAddress); const [position, setPosition] = useState(String(defaultPosition)); const [isDefault, setIsDefault] = useState(defaultIsDefault); const open = controlledOpen ?? internalOpen; const setOpen = controlledOnOpenChange ?? setInternalOpen;
  return <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (next) { setName(defaultName); setAddress(defaultAddress); setPosition(String(defaultPosition)); setIsDefault(defaultIsDefault); } }}><DialogTrigger asChild>{trigger}</DialogTrigger><DialogContent><DialogHeader><DialogTitle>{title}</DialogTitle>{description && <DialogDescription>{description}</DialogDescription>}</DialogHeader><form className="space-y-4" onSubmit={async (event) => { event.preventDefault(); const order = Number(position); if (name.trim().length < 2 || name.trim().length > 100) return toast.error("Informe um nome entre 2 e 100 caracteres"); if (address.trim().length < 3) return toast.error("Informe o endereço"); if (!Number.isInteger(order) || order < 0) return toast.error("Informe uma ordem válida"); try { await onSave({ name: name.trim(), address: address.trim(), position: order, is_default: isDefault }); setOpen(false); } catch { /* A alteração exibe a mensagem. */ } }}><div className="space-y-2"><Label htmlFor={`delivery-point-name-${defaultName || "new"}`}>Nome</Label><Input id={`delivery-point-name-${defaultName || "new"}`} maxLength={100} value={name} onChange={(event) => setName(event.target.value)} required /></div><div className="space-y-2"><Label htmlFor={`delivery-point-address-${defaultName || "new"}`}>Endereço</Label><Input id={`delivery-point-address-${defaultName || "new"}`} value={address} onChange={(event) => setAddress(event.target.value)} required /></div><div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor={`delivery-point-position-${defaultName || "new"}`}>Ordem</Label><Input id={`delivery-point-position-${defaultName || "new"}`} type="number" min={0} step={1} value={position} onChange={(event) => setPosition(event.target.value)} required /></div><div className="flex items-end gap-3 pb-2"><Switch id={`delivery-point-default-${defaultName || "new"}`} checked={isDefault} onCheckedChange={setIsDefault} /><Label htmlFor={`delivery-point-default-${defaultName || "new"}`}>Usar como padrão</Label></div></div><DialogFooter><Button type="submit" disabled={saving}>Salvar</Button></DialogFooter></form></DialogContent></Dialog>;
}