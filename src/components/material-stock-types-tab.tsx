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
  const invalidate = () => qc.invalidateQueries({ queryKey: ["material-stock-types"] });
  const update = useMutation({
    mutationFn: async ({ code, name, position }: { code: string; name: string; position: number }) => {
      if (types?.some((item) => item.code !== code && item.name.trim().toLocaleLowerCase("pt-BR") === name.trim().toLocaleLowerCase("pt-BR"))) throw new Error("Este tipo já está cadastrado");
      const { error } = await supabase.from("material_stock_types").update({ name: name.trim(), position }).eq("code", code);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Tipo de estoque atualizado"); invalidate(); },
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
    <CardHeader className="flex flex-row items-start justify-between gap-4"><div><CardTitle>Tipos de Estoque</CardTitle>{expanded && <CardDescription>Os tipos ativos aparecem ao cadastrar um item novo em Materiais.</CardDescription>}</div><CollapsibleTrigger asChild><Button size="icon" variant="ghost" aria-label={expanded ? "Recolher Tipos de Estoque" : "Expandir Tipos de Estoque"} title={expanded ? "Recolher" : "Expandir"}>{expanded ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}</Button></CollapsibleTrigger></CardHeader>
    <CollapsibleContent asChild><CardContent>{isLoading ? <p className="text-sm text-muted-foreground">Carregando...</p> : <Table><TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Ordem</TableHead><TableHead>Ativo</TableHead><TableHead /></TableRow></TableHeader><TableBody>{(types ?? []).map((type) => <TableRow key={type.code}><TableCell className="font-medium">{type.name}</TableCell><TableCell>{type.position}</TableCell><TableCell><Switch checked={type.active} onCheckedChange={(active) => toggle.mutate({ code: type.code, active })} /></TableCell><TableCell className="text-right"><div className="flex items-center justify-end gap-1"><StockTypeDialog defaultName={type.name} defaultPosition={type.position} saving={update.isPending} onSave={(name, position) => update.mutateAsync({ code: type.code, name, position })} trigger={<Button size="icon" variant="ghost" title={`Editar ${type.name}`} aria-label={`Editar ${type.name}`}><Pencil className="h-4 w-4" /></Button>} /><LinkedRecordDeletionDialog entityId={type.code} entityName={type.name} entityLabel="tipo de estoque" linkField="request_type" destinations={[]} onDelete={() => undefined} deleteBlockedReason="Este tipo determina a área em que os itens são cadastrados. Para removê-lo da lista, desative a opção." /></div></TableCell></TableRow>)}</TableBody></Table>}</CardContent></CollapsibleContent>
  </Card></Collapsible>;
}

function StockTypeDialog({ defaultName, defaultPosition, saving, onSave, trigger }: { defaultName: string; defaultPosition: number; saving: boolean; onSave: (name: string, position: number) => Promise<unknown>; trigger: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(defaultName);
  const [position, setPosition] = useState(String(defaultPosition));
  return <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (next) { setName(defaultName); setPosition(String(defaultPosition)); } }}><DialogTrigger asChild>{trigger}</DialogTrigger><DialogContent><DialogHeader><DialogTitle>Editar tipo de estoque</DialogTitle><DialogDescription>Altere o nome apresentado e a ordem da opção.</DialogDescription></DialogHeader><form className="space-y-4" onSubmit={async (event) => { event.preventDefault(); const order = Number(position); if (name.trim().length < 2 || name.trim().length > 120) return toast.error("Informe um nome entre 2 e 120 caracteres"); if (!Number.isInteger(order) || order < 0) return toast.error("Informe uma ordem válida"); try { await onSave(name.trim(), order); setOpen(false); } catch { /* A alteração exibe a mensagem. */ } }}><div className="space-y-2"><Label htmlFor={`material-stock-type-name-${defaultName}`}>Nome</Label><Input id={`material-stock-type-name-${defaultName}`} value={name} onChange={(event) => setName(event.target.value)} maxLength={120} required /></div><div className="space-y-2"><Label htmlFor={`material-stock-type-position-${defaultName}`}>Ordem</Label><Input id={`material-stock-type-position-${defaultName}`} type="number" min={0} step={1} value={position} onChange={(event) => setPosition(event.target.value)} required /></div><DialogFooter><Button type="submit" disabled={saving}>Salvar</Button></DialogFooter></form></DialogContent></Dialog>;
}