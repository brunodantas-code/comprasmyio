import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Minus, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { MaterialDetailDialog } from "@/components/material-detail";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";

type MaterialSource = "materials" | "terceiros_materials" | "tool_assets";

type RegistryMaterial = {
  id: string;
  name: string;
  description: string | null;
  manufacturer_code: string | null;
  source: MaterialSource;
  group: string;
};

const normalize = (value: string | null) => (value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");

function useRegistryMaterials() {
  return useQuery({
    queryKey: ["materials-registry"],
    queryFn: async () => {
      const [{ data: materials, error: materialsError }, { data: terceiros, error: terceirosError }, { data: tools, error: toolsError }] = await Promise.all([
        supabase.from("materials").select("id,name,description,manufacturer_code,location").in("location", ["fabrica", "almoxarifado"]).eq("is_manufactured", false).order("name"),
        supabase.from("terceiros_materials").select("id,name,description,manufacturer_code").order("name"),
        supabase.from("tool_assets").select("id,name,description,manufacturer_code").order("name"),
      ]);
      if (materialsError) throw materialsError;
      if (terceirosError) throw terceirosError;
      if (toolsError) throw toolsError;

      return [
        ...(materials ?? []).map((item) => ({ ...item, source: "materials" as const, group: item.location === "fabrica" ? "Insumos de Fabricação" : "Material de Almoxarifado" })),
        ...(terceiros ?? []).map((item) => ({ ...item, source: "terceiros_materials" as const, group: "Insumos de Instalação" })),
        ...(tools ?? []).map((item) => ({ ...item, source: "tool_assets" as const, group: "Máquinas e Ferramentas" })),
      ] satisfies RegistryMaterial[];
    },
  });
}

function DeleteMaterialButton({ material }: { material: RegistryMaterial }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const remove = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from(material.source).delete().eq("id", material.id);
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("Material excluído");
      setOpen(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["materials-registry"] }),
        queryClient.invalidateQueries({ queryKey: ["materials"] }),
        queryClient.invalidateQueries({ queryKey: ["purchasable-items"] }),
        queryClient.invalidateQueries({ queryKey: ["material-stock"] }),
        queryClient.invalidateQueries({ queryKey: ["terceiros-stock"] }),
        queryClient.invalidateQueries({ queryKey: ["tool-stock"] }),
      ]);
    },
    onError: (error: Error) => toast.error(error.message.includes("foreign key") || error.message.includes("constraint") ? "Este material possui vínculos e não pode ser excluído." : error.message),
  });

  return <AlertDialog open={open} onOpenChange={setOpen}>
    <AlertDialogTrigger asChild>
      <Button variant="ghost" size="icon" className="!h-6 !w-6 shrink-0 text-destructive hover:text-destructive" title={`Excluir ${material.name}`} aria-label={`Excluir ${material.name}`}>
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </AlertDialogTrigger>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Excluir material</AlertDialogTitle>
        <AlertDialogDescription>Confirma a exclusão de “{material.name}”? O histórico de movimentações desse item também será removido.</AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancelar</AlertDialogCancel>
        <AlertDialogAction disabled={remove.isPending} onClick={() => remove.mutate()} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>;
}

export function MaterialsRegistryTab() {
  const [expanded, setExpanded] = useState(false);
  const [search, setSearch] = useState("");
  const { data: materials = [], isLoading } = useRegistryMaterials();
  const filtered = useMemo(() => {
    const term = normalize(search.trim());
    if (!term) return materials;
    return materials.filter((item) => normalize(`${item.name} ${item.description ?? ""} ${item.manufacturer_code ?? ""} ${item.group}`).includes(term));
  }, [materials, search]);

  return <Collapsible open={expanded} onOpenChange={setExpanded} asChild>
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Materiais</CardTitle>
          {expanded && <CardDescription>Itens cadastrados e disponíveis para novas solicitações.</CardDescription>}
        </div>
        <CollapsibleTrigger asChild>
          <Button size="icon" variant="ghost" aria-label={expanded ? "Recolher Materiais" : "Expandir Materiais"} title={expanded ? "Recolher" : "Expandir"}>
            {expanded ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          </Button>
        </CollapsibleTrigger>
      </CardHeader>
      <CollapsibleContent asChild>
        <CardContent className="space-y-4">
          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar material..." className="pl-9" />
          </div>
          {isLoading ? <p className="text-sm text-muted-foreground">Carregando...</p> : !filtered.length ? <p className="text-sm text-muted-foreground">Nenhum material encontrado.</p> : <Table>
            <TableHeader><TableRow><TableHead>Material</TableHead><TableHead>Categoria</TableHead><TableHead>Cód. Fabricante</TableHead><TableHead className="w-16" /></TableRow></TableHeader>
            <TableBody>{filtered.map((material) => <TableRow key={`${material.source}:${material.id}`}>
              <TableCell><div className="font-medium">{material.name}</div>{material.description && <div className="max-w-xl truncate text-xs text-muted-foreground">{material.description}</div>}</TableCell>
              <TableCell>{material.group}</TableCell>
              <TableCell>{material.manufacturer_code || "—"}</TableCell>
              <TableCell><div className="flex items-center justify-end gap-1">
                <MaterialDetailDialog materialId={material.id} name={material.name} table={material.source} startEditing trigger={<Button variant="ghost" size="icon" className="!h-6 !w-6 shrink-0" title={`Editar ${material.name}`} aria-label={`Editar ${material.name}`}><Pencil className="h-3.5 w-3.5" /></Button>} />
                <DeleteMaterialButton material={material} />
              </div></TableCell>
            </TableRow>)}</TableBody>
          </Table>}
        </CardContent>
      </CollapsibleContent>
    </Card>
  </Collapsible>;
}