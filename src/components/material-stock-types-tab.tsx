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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LinkedRecordDeletionDialog } from "@/components/linked-record-deletion-dialog";

export type MaterialStockType = {
  code: string;
  name: string;
  destination_type: "fabrica" | "terceiros" | "almoxarifado" | "ferramentas";
  position: number;
  active: boolean;
  is_system: boolean;
};

export function useMaterialStockTypes() {
  return useQuery({
    queryKey: ["material-stock-types"],
    queryFn: async () => {
      const { data, error } = await supabase.from("material_stock_types").select("code,name,destination_type,position,active,is_system").order("position").order("name");
      if (error) throw error;
      return data as MaterialStockType[];
    },
  });
}

export function MaterialStockTypesTab() {
  const qc = useQueryClient();
  const { data: types, isLoading } = useMaterialStockTypes();
  const [expanded, setExpanded] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const invalidate = () => qc.invalidateQueries({ queryKey: ["material-stock-types"] });
  const create = useMutation({
    mutationFn: async ({ name, position, destinationType }: { name: string; position: number; destinationType: MaterialStockType["destination_type"] }) => {
      const code = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").trim().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
      if (!code) throw new Error("Informe um nome válido");
      if (types?.some((item) => item.code === code || item.name.trim().toLocaleLowerCase("pt-BR") === name.trim().toLocaleLowerCase("pt-BR"))) throw new Error("Este tipo já está cadastrado");
      const { error } = await supabase.from("material_stock_types").insert({ code, name: name.trim(), destination_type: destinationType, position, is_system: false });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Categoria de material criada"); setCreateOpen(false); invalidate(); },
    onError: (error: Error) => toast.error(error.message),
  });
  const update = useMutation({
    mutationFn: async ({ code, name, position }: { code: string; name: string; position: number }) => {
      if (types?.some((item) => item.code !== code && item.name.trim().toLocaleLowerCase("pt-BR") === name.trim().toLocaleLowerCase("pt-BR"))) throw new Error("Este tipo já está cadastrado");
      const { error } = await supabase.from("material_stock_types").update({ name: name.trim(), position }).eq("code", code);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Categoria de material atualizada"); invalidate(); },
    onError: (error: Error) => toast.error(error.message),
  });
  const toggle = useMutation({
    mutationFn: async ({ code, active }: { code: string; active: boolean }) => {
      const { error } = await supabase.from("material_stock_types").update({ active }).eq("code", code);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (error: Error) => toast.error(error.message),
  });

  return <Collapsible open={expanded} onOpenChange={setExpanded} asChild><Card>
    <CardHeader className="flex flex-row items-start justify-between gap-4"><div><CardTitle>Categorias de Materiais</CardTitle>{expanded && <CardDescription>As categorias ativas aparecem ao adicionar um novo material.</CardDescription>}</div><div className="flex items-center gap-1"><CollapsibleContent><StockTypeDialog title="Nova categoria de material" defaultPosition={Math.max(0, ...(types ?? []).map((item) => item.position)) + 1} saving={create.isPending} onSave={(name, position, destinationType) => create.mutateAsync({ name, position, destinationType })} trigger={<Button size="compactIcon" aria-label="Criar categoria de material" title="Criar categoria"><Plus className="h-3.5 w-3.5" /></Button>} open={createOpen} onOpenChange={setCreateOpen} /></CollapsibleContent><CollapsibleTrigger asChild><Button size="compactIcon" variant="ghost" aria-label={expanded ? "Recolher Categorias de Materiais" : "Expandir Categorias de Materiais"} title={expanded ? "Recolher" : "Expandir"}>{expanded ? <Minus className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}</Button></CollapsibleTrigger></div></CardHeader>
    <CollapsibleContent asChild><CardContent>{isLoading ? <p className="text-sm text-muted-foreground">Carregando...</p> : <Table><TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Ordem</TableHead><TableHead>Ativo</TableHead><TableHead /></TableRow></TableHeader><TableBody>{(types ?? []).map((type) => <TableRow key={type.code}><TableCell className="font-medium">{type.name}</TableCell><TableCell>{type.position}</TableCell><TableCell><Switch checked={type.active} onCheckedChange={(active) => toggle.mutate({ code: type.code, active })} /></TableCell><TableCell className="text-right"><div className="flex items-center justify-end gap-1"><StockTypeDialog defaultName={type.name} defaultPosition={type.position} saving={update.isPending} onSave={(name, position) => update.mutateAsync({ code: type.code, name, position })} trigger={<Button size="compactIcon" variant="ghost" title={`Editar ${type.name}`} aria-label={`Editar ${type.name}`}><Pencil className="h-3.5 w-3.5" /></Button>} /><LinkedRecordDeletionDialog entityId={type.code} entityName={type.name} entityLabel="tipo de estoque" linkField="request_type" destinations={[]} onDelete={() => undefined} deleteBlockedReason="Este tipo determina a área em que os itens são cadastrados. Para removê-lo da lista, desative a opção." /></div></TableCell></TableRow>)}</TableBody></Table>}</CardContent></CollapsibleContent>
  </Card></Collapsible>;
}

function StockTypeDialog({ title = "Editar categoria de material", defaultName = "", defaultPosition, saving, onSave, trigger, open: controlledOpen, onOpenChange }: { title?: string; defaultName?: string; defaultPosition: number; saving: boolean; onSave: (name: string, position: number, destinationType: MaterialStockType["destination_type"]) => Promise<unknown>; trigger: ReactNode; open?: boolean; onOpenChange?: (open: boolean) => void }) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [name, setName] = useState(defaultName);
  const [position, setPosition] = useState(String(defaultPosition));
  const [destinationType, setDestinationType] = useState<MaterialStockType["destination_type"]>("fabrica");
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  return <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (next) { setName(defaultName); setPosition(String(defaultPosition)); setDestinationType("fabrica"); } }}><DialogTrigger asChild>{trigger}</DialogTrigger><DialogContent><DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>Defina o nome, a ordem e em qual estoque os itens desta categoria serão cadastrados.</DialogDescription></DialogHeader><form className="space-y-4" onSubmit={async (event) => { event.preventDefault(); const order = Number(position); if (name.trim().length < 2 || name.trim().length > 120) return toast.error("Informe um nome entre 2 e 120 caracteres"); if (!Number.isInteger(order) || order < 0) return toast.error("Informe uma ordem válida"); try { await onSave(name.trim(), order, destinationType); setOpen(false); } catch { /* A alteração exibe a mensagem. */ } }}><div className="space-y-2"><Label htmlFor={`material-stock-type-name-${defaultName || "new"}`}>Nome</Label><Input id={`material-stock-type-name-${defaultName || "new"}`} value={name} onChange={(event) => setName(event.target.value)} maxLength={120} required /></div>{!defaultName ? <div className="space-y-2"><Label>Estoque relacionado</Label><Select value={destinationType} onValueChange={(value) => setDestinationType(value as MaterialStockType["destination_type"])}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="fabrica">Estoque Fábrica</SelectItem><SelectItem value="terceiros">Estoque Myio</SelectItem><SelectItem value="almoxarifado">Estoque Almoxarifado</SelectItem><SelectItem value="ferramentas">Ferramentas e Ativos</SelectItem></SelectContent></Select></div> : null}<div className="space-y-2"><Label htmlFor={`material-stock-type-position-${defaultName || "new"}`}>Ordem</Label><Input id={`material-stock-type-position-${defaultName || "new"}`} type="number" min={0} step={1} value={position} onChange={(event) => setPosition(event.target.value)} required /></div><DialogFooter><Button type="submit" disabled={saving}>Salvar</Button></DialogFooter></form></DialogContent></Dialog>;
}